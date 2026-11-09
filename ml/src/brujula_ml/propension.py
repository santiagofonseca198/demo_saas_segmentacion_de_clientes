"""Propensión de compra: ¿volverá el hogar a comprar en los próximos 14 días?

Diseño temporal sin fuga: cada snapshot toma un corte `t`, calcula features
con lo ocurrido hasta `t` y la etiqueta con lo ocurrido en (t, t + VENTANA].
Se entrena con cortes antiguos, se ajusta con uno posterior (validación) y se
mide con el último (test), igual que funcionaría el modelo puesto en marcha.

La ventana es de 14 días y no de 30: en un supermercado el 83–86 % de los
hogares vuelve dentro de 30 días, y con esa tasa base la pregunta casi no
discrimina (ver notebook 01).
"""

from __future__ import annotations

import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from .features import GRUPOS, etiqueta_compra, features_en

VENTANA = 14
CORTES_ENTRENAMIENTO = pd.date_range("2017-03-31", "2017-10-31", freq="ME")
CORTE_VALIDACION = pd.Timestamp("2017-11-15")
CORTE_TEST = pd.Timestamp("2017-12-01")
CORTE_FINAL = pd.Timestamp("2017-12-31")

# Mismos cortes que la app (src/lib/data/propension.ts), para medir las bandas.
CORTE_ALTA = 0.60
CORTE_MEDIA = 0.30


def snapshot(c: pd.DataFrame, corte, campanas_tabla=None) -> pd.DataFrame:
    f = features_en(c, corte, campanas_tabla)
    f["y"] = etiqueta_compra(c, corte, VENTANA, f.index)
    f["corte"] = pd.Timestamp(corte)
    return f


def snapshots(c: pd.DataFrame, cortes, campanas_tabla=None) -> pd.DataFrame:
    return pd.concat([snapshot(c, t, campanas_tabla) for t in cortes])


def _log_signo(X):
    return np.sign(X) * np.log1p(np.abs(X))


def logistica() -> Pipeline:
    """Línea base: regresión logística regularizada, lo que la app simula hoy."""
    return make_pipeline(
        SimpleImputer(strategy="median"),
        FunctionTransformer(_log_signo),
        StandardScaler(),
        LogisticRegression(C=1.0, max_iter=2000),
    )


PARAMETROS_BASE = {
    "objective": "binary",
    "learning_rate": 0.03,
    "verbose": -1,
    "seed": 0,
    "deterministic": True,
    "force_row_wise": True,
}


def entrenar_lgbm(
    X: pd.DataFrame,
    y: pd.Series,
    params: dict,
    X_val: pd.DataFrame | None = None,
    y_val: pd.Series | None = None,
    rondas: int = 3000,
) -> lgb.Booster:
    datos = lgb.Dataset(X, y)
    if X_val is None:
        return lgb.train({**PARAMETROS_BASE, **params}, datos, num_boost_round=rondas)
    val = lgb.Dataset(X_val, y_val, reference=datos)
    return lgb.train(
        {**PARAMETROS_BASE, **params},
        datos,
        num_boost_round=rondas,
        valid_sets=[val],
        callbacks=[lgb.early_stopping(100, verbose=False)],
    )


def buscar_lgbm(X, y, X_val, y_val, intentos: int = 40, semilla: int = 0) -> optuna.Study:
    """Búsqueda bayesiana (TPE) de hiperparámetros, midiendo log-loss en validación."""

    def objetivo(trial: optuna.Trial) -> float:
        params = {
            "num_leaves": trial.suggest_int("num_leaves", 7, 63, log=True),
            "min_data_in_leaf": trial.suggest_int("min_data_in_leaf", 20, 400, log=True),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
            "bagging_freq": 1,
            "lambda_l2": trial.suggest_float("lambda_l2", 1e-3, 30, log=True),
        }
        modelo = entrenar_lgbm(X, y, params, X_val, y_val)
        trial.set_user_attr("rondas", modelo.best_iteration)
        return log_loss(y_val, modelo.predict(X_val, num_iteration=modelo.best_iteration))

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    estudio = optuna.create_study(
        direction="minimize", sampler=optuna.samplers.TPESampler(seed=semilla)
    )
    estudio.optimize(objetivo, n_trials=intentos)
    return estudio


class Platt:
    """Calibración afín en log-odds: p = σ(a·z + b).

    Al ser afín, conserva la descomposición aditiva de SHAP: cada aporte se
    multiplica por `a` y el intercepto pasa a `a·base + b`. Así el "por qué"
    que muestra la app sigue sumando exactamente el puntaje calibrado.
    """

    def fit(self, z: np.ndarray, y: np.ndarray) -> Platt:
        lr = LogisticRegression(C=1e6, max_iter=1000).fit(z.reshape(-1, 1), y)
        self.a = float(lr.coef_[0, 0])
        self.b = float(lr.intercept_[0])
        return self

    def __call__(self, z: np.ndarray) -> np.ndarray:
        return 1 / (1 + np.exp(-(self.a * z + self.b)))


def log_odds(modelo: lgb.Booster, X: pd.DataFrame) -> np.ndarray:
    return modelo.predict(X, raw_score=True)


def metricas(y: np.ndarray, p: np.ndarray) -> dict[str, float]:
    alta = p >= CORTE_ALTA
    return {
        "roc_auc": roc_auc_score(y, p),
        "pr_auc": average_precision_score(y, p),
        "brier": brier_score_loss(y, p),
        "log_loss": log_loss(y, p),
        "tasa_base": float(np.mean(y)),
        "precision_banda_alta": float(np.mean(y[alta])) if alta.any() else float("nan"),
        "parte_banda_alta": float(np.mean(alta)),
        "lift_decil_1": lift_por_decil(y, p).iloc[0]["lift"],
    }


def lift_por_decil(y: np.ndarray, p: np.ndarray) -> pd.DataFrame:
    """Deciles de mayor a menor puntaje: tasa real de compra, lift y captura acumulada."""
    df = pd.DataFrame({"y": y, "p": p}).sort_values("p", ascending=False, ignore_index=True)
    df["decil"] = np.arange(len(df)) * 10 // len(df) + 1
    t = df.groupby("decil").agg(clientes=("y", "size"), compran=("y", "sum"), p_media=("p", "mean"))
    t["tasa"] = t["compran"] / t["clientes"]
    t["lift"] = t["tasa"] / df["y"].mean()
    t["captura_acumulada"] = t["compran"].cumsum() / df["y"].sum()
    return t


def aportes_por_grupo(modelo: lgb.Booster, X: pd.DataFrame, platt: Platt | None = None):
    """Contribuciones TreeSHAP (log-odds) sumadas por factor de negocio.

    Devuelve (aportes: DataFrame hogar × factor, intercepto: float). Se cumple
    σ(intercepto + Σ aportes) = probabilidad calibrada de cada hogar.
    """
    contrib = modelo.predict(X, pred_contrib=True)
    base = float(contrib[0, -1])
    shap = pd.DataFrame(contrib[:, :-1], index=X.index, columns=X.columns)
    aportes = shap.T.groupby(pd.Series(GRUPOS)).sum().T
    a, b = (platt.a, platt.b) if platt else (1.0, 0.0)
    return aportes * a, a * base + b
