"""Features por hogar calculadas en una fecha de corte.

Regla única para todo el proyecto: las features de un corte `t` solo miran
cestas con fecha <= t. Lo que pasa después de `t` es materia de etiquetas
(propensión) o de un corte posterior (migración de segmentos), nunca de
features. `tests/test_features.py` lo verifica.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .datos import cargar

INICIO = pd.Timestamp("2017-01-01")
FIN = pd.Timestamp("2017-12-31")

# Grupo de negocio de cada feature: son los cinco factores que muestra la app
# (`FactorId` en src/lib/data/types.ts). Los aportes SHAP se suman por grupo.
GRUPOS: dict[str, str] = {
    "recencia_dias": "recencia",
    "recencia_penultima": "recencia",
    "atraso_relativo": "recencia",
    "cestas_30": "frecuencia",
    "cestas_90": "frecuencia",
    "cestas_180": "frecuencia",
    "cestas_365": "frecuencia",
    "dias_activos_90": "frecuencia",
    "intervalo_medio": "frecuencia",
    "intervalo_std": "frecuencia",
    "antiguedad_dias": "frecuencia",
    "gasto_30": "valor",
    "gasto_90": "valor",
    "gasto_180": "valor",
    "gasto_365": "valor",
    "ticket_medio": "valor",
    "unidades_cesta": "valor",
    "pct_descuento": "promos",
    "pct_cestas_descuento": "promos",
    "cupones_180": "promos",
    "campanas_recibidas": "promos",
    "tasa_canje": "promos",
    "tendencia_90": "tendencia",
    "tendencia_30": "tendencia",
    "pendiente_semanal": "tendencia",
}
FEATURES = list(GRUPOS)


def transacciones() -> pd.DataFrame:
    """Líneas de 2017 con fecha (día), descuento total, departamento y subcategoría."""
    tx = cargar("transactions")
    tx["fecha"] = tx["transaction_timestamp"].dt.normalize()
    # Unas pocas líneas caen en la madrugada del 1-ene-2018; el año analizado es 2017.
    tx = tx[tx["fecha"] <= FIN].copy()
    tx["descuento"] = tx["retail_disc"] + tx["coupon_disc"] + tx["coupon_match_disc"]
    # El combustible (FUEL y parte de MISCELLANEOUS) registra lecturas del surtidor,
    # no unidades: miles por línea. Se cuenta como una unidad para no distorsionar.
    tx.loc[tx["quantity"] > 100, "quantity"] = 1.0
    productos = cargar("products")[["product_id", "department", "product_category"]]
    tx = tx.merge(productos, on="product_id", how="left")
    tx["department"] = tx["department"].fillna("SIN DEPARTAMENTO")
    return tx


def cestas(tx: pd.DataFrame) -> pd.DataFrame:
    """Una fila por cesta (= pedido en la app)."""
    c = (
        tx.groupby("basket_id", sort=False)
        .agg(
            household_id=("household_id", "first"),
            store_id=("store_id", "first"),
            fecha=("fecha", "first"),
            total=("sales_value", "sum"),
            unidades=("quantity", "sum"),
            descuento=("descuento", "sum"),
            cupon=("coupon_disc", "sum"),
        )
        .reset_index()
    )
    c["con_descuento"] = c["descuento"] > 0
    return c.sort_values(["fecha", "basket_id"], ignore_index=True)


def campanas() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Campañas recibidas por hogar con su fecha de inicio y si canjeó algún cupón."""
    recibidas = cargar("campaigns").merge(
        cargar("campaign_descriptions")[["campaign_id", "start_date"]], on="campaign_id"
    )
    recibidas["inicio"] = pd.to_datetime(recibidas["start_date"])
    canjes = cargar("coupon_redemptions")
    canjes["fecha"] = pd.to_datetime(canjes["redemption_date"])
    return recibidas[["household_id", "campaign_id", "inicio"]], canjes[
        ["household_id", "campaign_id", "fecha"]
    ]


def _ventana(c: pd.DataFrame, corte: pd.Timestamp, dias: int) -> pd.DataFrame:
    return c[c["fecha"] > corte - pd.Timedelta(days=dias)]


def features_en(
    c: pd.DataFrame,
    corte: pd.Timestamp,
    campanas_tabla: tuple[pd.DataFrame, pd.DataFrame] | None = None,
) -> pd.DataFrame:
    """Features de cada hogar con al menos una cesta hasta `corte` (inclusive)."""
    corte = pd.Timestamp(corte)
    pasado = c[c["fecha"] <= corte]
    hogares = pd.Index(pasado["household_id"].unique(), name="household_id")
    f = pd.DataFrame(index=hogares)

    por_hogar = pasado.groupby("household_id")
    ultima = por_hogar["fecha"].max()
    primera = por_hogar["fecha"].min()
    f["recencia_dias"] = (corte - ultima).dt.days
    f["antiguedad_dias"] = (corte - primera).dt.days

    # Días distintos con compra: un hogar puede hacer varias cestas el mismo día.
    dias = (
        pasado[["household_id", "fecha"]].drop_duplicates().sort_values(["household_id", "fecha"])
    )
    desde_el_final = dias.groupby("household_id").cumcount(ascending=False)
    penultima = dias[desde_el_final == 1].set_index("household_id")["fecha"]
    f["recencia_penultima"] = (corte - penultima).dt.days.reindex(hogares)

    for d in (30, 90, 180, 365):
        v = _ventana(pasado, corte, d).groupby("household_id")
        f[f"cestas_{d}"] = v.size().reindex(hogares, fill_value=0)
        f[f"gasto_{d}"] = v["total"].sum().reindex(hogares, fill_value=0.0)

    v90 = _ventana(dias, corte, 90).groupby("household_id")
    f["dias_activos_90"] = v90.size().reindex(hogares, fill_value=0)

    # Intervalos entre días de compra dentro de los últimos 180 días.
    d180 = _ventana(dias, corte, 180).sort_values(["household_id", "fecha"])
    salto = d180.groupby("household_id")["fecha"].diff().dt.days
    intervalos = salto.groupby(d180["household_id"])
    f["intervalo_medio"] = intervalos.mean().reindex(hogares)
    f["intervalo_std"] = intervalos.std().reindex(hogares)
    # ¿Cuánto lleva sin venir, comparado con lo que suele tardar? >1 = va con retraso.
    f["atraso_relativo"] = f["recencia_dias"] / f["intervalo_medio"]

    v180 = _ventana(pasado, corte, 180)
    g180 = v180.groupby("household_id")
    n180 = g180.size().reindex(hogares)
    f["ticket_medio"] = (f["gasto_180"] / n180).fillna(por_hogar["total"].mean())
    f["unidades_cesta"] = (g180["unidades"].sum().reindex(hogares) / n180).fillna(
        por_hogar["unidades"].mean()
    )
    bruto = g180["total"].sum() + g180["descuento"].sum()
    f["pct_descuento"] = (g180["descuento"].sum() / bruto.replace(0, np.nan)).reindex(hogares)
    f["pct_cestas_descuento"] = g180["con_descuento"].mean().reindex(hogares)
    f["cupones_180"] = (
        (v180["cupon"] > 0).groupby(v180["household_id"]).sum().reindex(hogares, fill_value=0)
    )

    recibidas, canjes = campanas_tabla if campanas_tabla is not None else campanas()
    rec = recibidas[recibidas["inicio"] <= corte]
    n_rec = rec.groupby("household_id")["campaign_id"].nunique()
    can = canjes[canjes["fecha"] <= corte]
    n_can = can.groupby("household_id")["campaign_id"].nunique()
    f["campanas_recibidas"] = n_rec.reindex(hogares, fill_value=0)
    f["tasa_canje"] = (n_can.reindex(hogares, fill_value=0) / f["campanas_recibidas"]).where(
        f["campanas_recibidas"] > 0
    )

    previos_90 = (
        pasado[(pasado["fecha"] <= corte - pd.Timedelta(days=90))]
        .pipe(_ventana, corte - pd.Timedelta(days=90), 90)
        .groupby("household_id")
        .size()
        .reindex(hogares, fill_value=0)
    )
    # Misma definición que la app: cestas de los últimos 90 días frente a los 90 anteriores.
    f["tendencia_90"] = (f["cestas_90"] + 1) / (previos_90 + 1)
    # Ritmo del último mes frente al ritmo mensual de los dos meses previos.
    f["tendencia_30"] = (f["cestas_30"] + 1) / ((f["cestas_90"] - f["cestas_30"]) / 2 + 1)
    f["pendiente_semanal"] = _pendiente_semanal(pasado, corte, hogares)

    return f[FEATURES].astype(float)


def _pendiente_semanal(pasado: pd.DataFrame, corte: pd.Timestamp, hogares: pd.Index) -> pd.Series:
    """Pendiente (gasto por semana) de una recta ajustada a las últimas 12 semanas."""
    v = _ventana(pasado, corte, 84)
    semana = ((corte - v["fecha"]).dt.days // 7).clip(upper=11)
    tabla = (
        v.assign(semana=11 - semana)
        .pivot_table(index="household_id", columns="semana", values="total", aggfunc="sum")
        .reindex(index=hogares, columns=range(12))
        .fillna(0.0)
    )
    x = np.arange(12) - 5.5
    return pd.Series(tabla.to_numpy() @ x / (x @ x), index=hogares)


def etiqueta_compra(
    c: pd.DataFrame, corte: pd.Timestamp, dias: int, hogares: pd.Index
) -> pd.Series:
    """1 si el hogar hace al menos una cesta en (corte, corte + dias]."""
    corte = pd.Timestamp(corte)
    futuro = c[(c["fecha"] > corte) & (c["fecha"] <= corte + pd.Timedelta(days=dias))]
    return pd.Series(hogares.isin(futuro["household_id"].unique()).astype(int), index=hogares)
