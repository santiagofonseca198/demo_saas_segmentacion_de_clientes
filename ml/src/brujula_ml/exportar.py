"""Exporta segmentos, puntajes y pedidos al formato que lee el dashboard.

El JSON reproduce el tipo `Dataset` de `src/lib/data/types.ts` con dos
compactaciones para que pese poco: los pedidos van como filas de arrays con
índices a las tablas de clientes, zonas, canales y productos (importes en
centavos), y los productos
son subcategorías de dunnhumby (`product_category`), no los 92.000 artículos.
El cargador de la app (`src/lib/data/real/cargar.ts`) deshace ambas.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .features import FIN
from .rutas import EXPORT_APP

VERSION = 1
# Último día del historial en la app (ULTIMO_DIA de src/lib/data/fechas.ts).
ULTIMO_DIA = 729
ZONAS = ["Tiendas de alto volumen", "Tiendas de volumen medio", "Tiendas de bajo volumen"]

DEPARTAMENTOS = {
    "GROCERY": "Abarrotes",
    "DRUG GM": "Droguería y hogar",
    "FUEL": "Combustible",
    "PRODUCE": "Frutas y verduras",
    "MEAT": "Carnes",
    "MEAT-PCKGD": "Carnes empacadas",
    "DELI": "Charcutería",
    "MISCELLANEOUS": "Varios",
    "PASTRY": "Panadería",
    "NUTRITION": "Nutrición",
    "SEAFOOD-PCKGD": "Pescado empacado",
    "FLORAL": "Floristería",
    "SEAFOOD": "Pescadería",
    "COSMETICS": "Cosmética",
    "SPIRITS": "Licores",
}

# Subcategorías que no son productos: se nombran para que se entiendan en el tablero.
RENOMBRAR_PRODUCTOS = {
    "Coupon/Misc Items": "Cupones y artículos varios",
    "Fuel": "Combustible",
}


def dia_de(fecha: pd.Series) -> pd.Series:
    return ULTIMO_DIA - (FIN - fecha).dt.days


def muestra_estratificada(segmentos: pd.Series, n: int, semilla: int = 0) -> pd.Index:
    """`n` hogares respetando la proporción de cada segmento."""
    if n >= len(segmentos):
        return segmentos.index
    partes = (segmentos.value_counts(normalize=True) * n).round().astype(int)
    elegidos = [
        segmentos[segmentos == s].sample(k, random_state=semilla).index for s, k in partes.items()
    ]
    return pd.Index(np.concatenate(elegidos))


def promos_usadas(hogares: pd.Index, recibidas: pd.DataFrame, canjes: pd.DataFrame) -> pd.Series:
    """De las últimas 5 campañas que recibió cada hogar, en cuántas canjeó un cupón."""
    ultimas = (
        recibidas[recibidas["inicio"] <= FIN].sort_values("inicio").groupby("household_id").tail(5)
    )
    canjeadas = canjes[["household_id", "campaign_id"]].drop_duplicates().assign(uso=1)
    uso = ultimas.merge(canjeadas, on=["household_id", "campaign_id"], how="left")["uso"].fillna(0)
    return (
        uso.groupby(ultimas["household_id"].to_numpy())
        .sum()
        .reindex(hogares, fill_value=0)
        .astype(int)
    )


def construir(
    tx: pd.DataFrame,
    c: pd.DataFrame,
    f_fin: pd.DataFrame,
    segmentos: pd.Series,
    probabilidad: pd.Series,
    aportes: pd.DataFrame,
    intercepto: float,
    campanas_tabla: tuple[pd.DataFrame, pd.DataFrame],
    n_hogares: int = 1000,
    ventana: int = 14,
) -> dict:
    # Zonas = formato de tienda. Las 457 tiendas reparten mucho la venta (las 6
    # mayores suman el 13 %), así que se agrupan en tercios del volumen total.
    ventas_tienda = c.groupby("store_id")["total"].sum().sort_values(ascending=False)
    tercio = np.minimum((ventas_tienda.cumsum() / ventas_tienda.sum() * 3).to_numpy() // 1, 2)
    zona_tienda = pd.Series(np.array(ZONAS)[tercio.astype(int)], index=ventas_tienda.index)
    zonas = ZONAS

    hogares = muestra_estratificada(segmentos, n_hogares)
    hogares = pd.Index(sorted(hogares, key=int), name="household_id")
    c = c[c["household_id"].isin(hogares)].copy()
    tx = tx[tx["household_id"].isin(hogares)].copy()
    c["zona"] = c["store_id"].map(zona_tienda)

    # El dataset no trae canal: se usa si la cesta llevó algún descuento.
    c["canal"] = np.where(c["con_descuento"], "Con promoción", "Precio regular")
    canales = ["Con promoción", "Precio regular"]

    # Productos = subcategorías; categoría = departamento traducido.
    tx["categoria"] = tx["department"].map(DEPARTAMENTOS).fillna("Otros")
    tx["producto"] = (
        tx["product_category"].fillna(tx["department"]).str.title().replace(RENOMBRAR_PRODUCTOS)
    )
    prod = (
        tx.groupby(["producto", "categoria"])
        .agg(ventas=("sales_value", "sum"), unidades=("quantity", "sum"))
        .reset_index()
        .sort_values("ventas", ascending=False, ignore_index=True)
    )
    prod["id"] = [f"PR-{i + 1:03d}" for i in range(len(prod))]
    prod["precio"] = (prod["ventas"] / prod["unidades"].clip(lower=1)).round(2)
    indice_producto = {
        (p, k): i for i, (p, k) in enumerate(zip(prod["producto"], prod["categoria"], strict=True))
    }

    lineas = (
        tx.groupby(["basket_id", "producto", "categoria"], sort=False)
        .agg(unidades=("quantity", "sum"), importe=("sales_value", "sum"))
        .reset_index()
    )
    lineas["p"] = [
        indice_producto[k] for k in zip(lineas["producto"], lineas["categoria"], strict=True)
    ]
    lineas = lineas[lineas["importe"] > 0]

    indice_cliente = {h: i for i, h in enumerate(hogares)}
    c["dia"] = dia_de(c["fecha"])
    c = c.sort_values(["dia", "basket_id"])
    por_cesta = {
        b: g[["p", "unidades", "importe"]].to_numpy()
        for b, g in lineas.groupby("basket_id", sort=False)
    }
    pedidos = []
    for fila in c.itertuples(index=False):
        ls = por_cesta.get(fila.basket_id)
        if ls is None:
            continue
        plano = []
        for p, u, imp in ls:
            plano += [int(p), int(round(u)), int(round(imp * 100))]
        pedidos.append(
            [
                indice_cliente[fila.household_id],
                int(fila.dia),
                zonas.index(fila.zona),
                canales.index(fila.canal),
                plano,
            ]
        )

    # Clientes: mismas métricas que calcula la app (src/lib/data/mock/generador.ts).
    f = f_fin.loc[hogares]
    zona_cliente = c.groupby("household_id")["zona"].agg(lambda s: s.mode().iat[0])
    canal_cliente = c.groupby("household_id")["canal"].agg(lambda s: s.mode().iat[0])
    primer_dia = c.groupby("household_id")["dia"].min()
    promos = promos_usadas(hogares, *campanas_tabla)
    clientes = []
    for h in hogares:
        frecuencia = int(f.at[h, "cestas_365"])
        valor = float(f.at[h, "gasto_365"])
        clientes.append(
            {
                "id": f"H-{int(h):04d}",
                "nombre": f"Hogar {int(h)}",
                "zona": zona_cliente[h],
                "canal": canal_cliente[h],
                "segmento": segmentos[h],
                "primerDia": int(primer_dia[h]),
                "recenciaDias": int(f.at[h, "recencia_dias"]),
                "frecuencia": frecuencia,
                "valor": round(valor, 2),
                "ticketPromedio": round(valor / frecuencia, 2) if frecuencia else 0.0,
                "promosUsadas": int(promos[h]),
                "tendencia": round(float(f.at[h, "tendencia_90"]), 3),
                "probabilidad": round(float(probabilidad[h]), 4),
                "factores": {k: round(float(v), 4) for k, v in aportes.loc[h].items()},
            }
        )

    return {
        "version": VERSION,
        "fuente": "dunnhumby The Complete Journey (paquete completejourney, CC0)",
        "fechaReferencia": FIN.strftime("%Y-%m-%d"),
        "ventanaPropension": ventana,
        "intercepto": round(intercepto, 4),
        "zonas": zonas,
        "canales": canales,
        "productos": [
            {"id": r.id, "nombre": r.producto, "categoria": r.categoria, "precio": float(r.precio)}
            for r in prod.itertuples()
        ],
        "clientes": clientes,
        "pedidos": pedidos,
    }


def guardar(datos: dict, destino=EXPORT_APP) -> int:
    destino.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    destino.write_text(texto, encoding="utf-8")
    return len(texto.encode("utf-8"))
