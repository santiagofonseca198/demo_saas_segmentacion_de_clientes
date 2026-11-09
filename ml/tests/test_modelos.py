"""Tests sobre datos sintéticos: no requieren descargar dunnhumby."""

import json

import numpy as np
import pandas as pd
import pytest

from brujula_ml import exportar as E
from brujula_ml import features as F
from brujula_ml import propension as P
from brujula_ml import segmentacion as S
from brujula_ml.rutas import EXPORT_APP

SIN_CAMPANAS = (
    pd.DataFrame(
        {
            "household_id": pd.Series(dtype=str),
            "campaign_id": pd.Series(dtype=str),
            "inicio": pd.Series(dtype="datetime64[us]"),
        }
    ),
    pd.DataFrame(
        {
            "household_id": pd.Series(dtype=str),
            "campaign_id": pd.Series(dtype=str),
            "fecha": pd.Series(dtype="datetime64[us]"),
        }
    ),
)


@pytest.fixture
def cestas():
    rng = np.random.default_rng(0)
    filas = []
    for h in range(30):
        cada = int(rng.integers(3, 40))
        for i, fecha in enumerate(pd.date_range("2017-01-03", "2017-12-31", freq=f"{cada}D")):
            total = float(rng.gamma(2, 15))
            filas.append(
                {
                    "basket_id": f"{h}-{i}",
                    "household_id": str(h),
                    "store_id": str(h % 4),
                    "fecha": fecha,
                    "total": total,
                    "unidades": float(rng.integers(1, 20)),
                    "descuento": total * 0.1 * (i % 2),
                    "cupon": 0.0,
                }
            )
    c = pd.DataFrame(filas)
    c["con_descuento"] = c["descuento"] > 0
    return c.sort_values("fecha", ignore_index=True)


def test_features_no_miran_el_futuro(cestas):
    corte = pd.Timestamp("2017-08-15")
    con_futuro = F.features_en(cestas, corte, SIN_CAMPANAS)
    sin_futuro = F.features_en(cestas[cestas["fecha"] <= corte], corte, SIN_CAMPANAS)
    pd.testing.assert_frame_equal(con_futuro, sin_futuro)


def test_features_cubren_todos_los_grupos(cestas):
    f = F.features_en(cestas, F.FIN, SIN_CAMPANAS)
    assert list(f.columns) == F.FEATURES
    assert set(F.GRUPOS.values()) == {"recencia", "frecuencia", "valor", "promos", "tendencia"}
    assert (f["recencia_dias"] >= 0).all()


def test_etiqueta_usa_solo_la_ventana():
    c = pd.DataFrame(
        {
            "household_id": ["a", "b", "c"],
            "fecha": pd.to_datetime(["2017-06-01", "2017-06-15", "2017-06-16"]),
        }
    )
    y = F.etiqueta_compra(c, "2017-06-01", 14, pd.Index(["a", "b", "c"]))
    # El día del corte no cuenta (es pasado); el día 14 sí; el 15 ya no.
    assert y.to_dict() == {"a": 0, "b": 1, "c": 0}


def test_nombres_de_segmento_siguen_al_arquetipo():
    centros = S.ARQUETIPOS.loc[["dormidos", "fieles", "enRiesgo", "prometedores"]].to_numpy()
    assert S.nombrar(centros) == {0: "dormidos", 1: "fieles", 2: "enRiesgo", 3: "prometedores"}


def test_aportes_suman_la_probabilidad_calibrada():
    rng = np.random.default_rng(1)
    X = pd.DataFrame(rng.normal(size=(600, len(F.FEATURES))), columns=F.FEATURES)
    y = (X["recencia_dias"] + rng.normal(size=600) < 0).astype(int)
    modelo = P.entrenar_lgbm(X, y, {"num_leaves": 7}, rondas=50)
    platt = P.Platt().fit(P.log_odds(modelo, X), y.to_numpy())
    aportes, intercepto = P.aportes_por_grupo(modelo, X, platt)
    assert list(aportes.columns) == sorted(
        {"recencia", "frecuencia", "valor", "promos", "tendencia"}
    )
    reconstruida = 1 / (1 + np.exp(-(intercepto + aportes.sum(axis=1))))
    np.testing.assert_allclose(reconstruida, platt(P.log_odds(modelo, X)), atol=1e-9)


def test_lift_por_decil():
    y = np.array([1] * 50 + [0] * 50)
    p = np.linspace(1, 0, 100)
    t = P.lift_por_decil(y, p)
    assert t.loc[1, "lift"] == pytest.approx(2.0)
    assert t["captura_acumulada"].iloc[-1] == pytest.approx(1.0)


def test_muestra_estratificada_respeta_proporciones():
    seg = pd.Series(["fieles"] * 500 + ["dormidos"] * 300 + ["enRiesgo"] * 200)
    m = E.muestra_estratificada(seg, 100)
    assert seg[m].value_counts().to_dict() == {"fieles": 50, "dormidos": 30, "enRiesgo": 20}


def test_ultimo_dia_de_datos_es_el_ultimo_dia_de_la_app():
    assert E.dia_de(pd.Series([F.FIN, F.INICIO])).tolist() == [729, 365]


@pytest.mark.skipif(not EXPORT_APP.exists(), reason="aún no se ha exportado el JSON")
def test_json_exportado_es_coherente():
    d = json.loads(EXPORT_APP.read_text(encoding="utf-8"))
    assert d["version"] == E.VERSION
    assert {c["segmento"] for c in d["clientes"]} == set(S.SEGMENTOS)
    for c in d["clientes"][:200]:
        z = d["intercepto"] + sum(c["factores"].values())
        assert 1 / (1 + np.exp(-z)) == pytest.approx(c["probabilidad"], abs=2e-3)
    n_clientes, n_zonas, n_canales, n_productos = (
        len(d["clientes"]),
        len(d["zonas"]),
        len(d["canales"]),
        len(d["productos"]),
    )
    for cliente, dia, zona, canal, lineas in d["pedidos"][:5000]:
        assert 0 <= cliente < n_clientes and 0 <= dia <= 729
        assert 0 <= zona < n_zonas and 0 <= canal < n_canales
        assert len(lineas) % 3 == 0 and all(0 <= p < n_productos for p in lineas[::3])
