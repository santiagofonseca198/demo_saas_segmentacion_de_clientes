"""Segmentación: K-Means descubre los segmentos y un SVM los asigna después.

El clustering se ajusta una sola vez, en una fecha de entrenamiento, y define
qué significa cada segmento. Volver a clusterizar cada mes cambiaría los
grupos y sus nombres. En producción, un SVM entrenado sobre esas etiquetas
asigna a cada cliente su segmento con datos nuevos, de forma estable y con
una medida de confianza.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from sklearn.calibration import CalibratedClassifierCV
from sklearn.cluster import KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.mixture import GaussianMixture
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler
from sklearn.svm import SVC, LinearSVC

SEGMENTOS = ["fieles", "prometedores", "enRiesgo", "dormidos"]

# Variables de ciclo de vida y valor: responden a la pregunta de negocio
# ("¿quién compra mucho, quién se está yendo?"). La mezcla de departamentos y la
# demografía se usan para describir los segmentos, no para formarlos.
COLUMNAS = ["recencia_dias", "cestas_365", "gasto_365", "ticket_medio", "tendencia_90"]

# Perfil esperado de cada segmento, en desviaciones estándar sobre las variables
# transformadas. Solo sirve para poner nombre a los clusters (asignación húngara);
# no interviene en cómo se forman.
ARQUETIPOS = pd.DataFrame(
    {
        "fieles": [-1.0, 1.0, 1.0, 0.3, 0.0],
        "prometedores": [-0.3, -0.3, -0.3, 0.0, 1.5],
        "enRiesgo": [0.3, 0.0, 0.0, 0.0, -0.8],
        "dormidos": [1.5, -1.5, -1.5, -0.5, 0.0],
    },
    index=COLUMNAS,
).T


def preprocesador() -> Pipeline:
    """log1p (todas las variables tienen cola larga) y estandarización."""
    return make_pipeline(
        FunctionTransformer(np.log1p, feature_names_out="one-to-one"), StandardScaler()
    )


def matriz(f: pd.DataFrame) -> pd.DataFrame:
    return f[COLUMNAS].fillna(0.0)


def evaluar_k(Z: np.ndarray, ks=range(2, 9), semilla: int = 0) -> pd.DataFrame:
    filas = []
    for k in ks:
        km = KMeans(k, n_init=20, random_state=semilla).fit(Z)
        gmm = GaussianMixture(k, n_init=3, random_state=semilla).fit(Z)
        filas.append(
            {
                "k": k,
                "inercia": km.inertia_,
                "silhouette": silhouette_score(Z, km.labels_),
                "davies_bouldin": davies_bouldin_score(Z, km.labels_),
                "calinski_harabasz": calinski_harabasz_score(Z, km.labels_),
                "bic_gmm": gmm.bic(Z),
            }
        )
    return pd.DataFrame(filas).set_index("k")


def estabilidad(Z: np.ndarray, k: int, replicas: int = 30, semilla: int = 0) -> np.ndarray:
    """ARI entre el modelo completo y modelos ajustados en remuestreos bootstrap."""
    rng = np.random.default_rng(semilla)
    referencia = KMeans(k, n_init=20, random_state=semilla).fit(Z).labels_
    aris = []
    for _ in range(replicas):
        idx = rng.integers(0, len(Z), len(Z))
        km = KMeans(k, n_init=10, random_state=int(rng.integers(1 << 31))).fit(Z[idx])
        aris.append(adjusted_rand_score(referencia, km.predict(Z)))
    return np.array(aris)


def nombrar(centros_z: np.ndarray) -> dict[int, str]:
    """Asigna a cada cluster el segmento cuyo arquetipo tiene más cerca."""
    distancias = np.linalg.norm(centros_z[:, None, :] - ARQUETIPOS.to_numpy()[None, :, :], axis=2)
    filas, columnas = linear_sum_assignment(distancias)
    return {int(f): ARQUETIPOS.index[c] for f, c in zip(filas, columnas, strict=True)}


class Segmentador:
    """K-Means k=4 sobre las variables transformadas, con nombres de negocio."""

    def __init__(self, k: int = 4, semilla: int = 0):
        self.k = k
        self.semilla = semilla

    def fit(self, f: pd.DataFrame) -> Segmentador:
        self.prep_ = preprocesador().fit(matriz(f))
        Z = self.prep_.transform(matriz(f))
        self.kmeans_ = KMeans(self.k, n_init=50, random_state=self.semilla).fit(Z)
        self.nombres_ = nombrar(self.kmeans_.cluster_centers_)
        return self

    def predict(self, f: pd.DataFrame) -> pd.Series:
        cluster = self.kmeans_.predict(self.prep_.transform(matriz(f)))
        return pd.Series([self.nombres_[c] for c in cluster], index=f.index, name="segmento")


def buscar_svm(X: pd.DataFrame, y: pd.Series, semilla: int = 0) -> GridSearchCV:
    """SVM RBF con búsqueda de C y gamma en validación cruzada estratificada."""
    modelo = Pipeline([("prep", preprocesador()), ("svm", SVC(kernel="rbf"))])
    rejilla = {"svm__C": [0.3, 1, 3, 10, 30, 100], "svm__gamma": ["scale", 0.03, 0.1, 0.3, 1]}
    cv = StratifiedKFold(5, shuffle=True, random_state=semilla)
    return GridSearchCV(modelo, rejilla, scoring="f1_macro", cv=cv, n_jobs=-1).fit(X, y)


def svm_final(X: pd.DataFrame, y: pd.Series, C: float, gamma, semilla: int = 0) -> Pipeline:
    """SVM con los hiperparámetros elegidos y probabilidades calibradas (confianza)."""
    svm = CalibratedClassifierCV(SVC(kernel="rbf", C=C, gamma=gamma), ensemble=False, cv=5)
    return Pipeline([("prep", preprocesador()), ("svm", svm)]).fit(X, y)


def svm_lineal(X: pd.DataFrame, y: pd.Series, semilla: int = 0) -> Pipeline:
    return Pipeline(
        [("prep", preprocesador()), ("svm", LinearSVC(C=1.0, random_state=semilla))]
    ).fit(X, y)


def migracion(antes: pd.Series, despues: pd.Series) -> pd.DataFrame:
    """Cuántos clientes pasaron de cada segmento a cada otro entre dos fechas."""
    comun = antes.index.intersection(despues.index)
    tabla = pd.crosstab(antes[comun], despues[comun], rownames=["antes"], colnames=["después"])
    return tabla.reindex(index=SEGMENTOS, columns=SEGMENTOS, fill_value=0)
