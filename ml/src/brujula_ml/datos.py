"""Descarga y carga de dunnhumby The Complete Journey.

Se usa la versión publicada con el paquete R `completejourney` (licencia CC0),
que se descarga sin credenciales desde su repositorio de GitHub. Los archivos
crudos se verifican con SHA-256 contra `ml/datos.sha256.json` y se convierten a
parquet para que el resto del proyecto no dependa de formatos de R.

Uso:  python -m brujula_ml.datos
"""

from __future__ import annotations

import hashlib
import json
import urllib.request

import pandas as pd
import pyreadr

from .rutas import CRUDOS, ML, PROCESADOS

URL_BASE = "https://github.com/bradleyboehmke/completejourney/raw/master/data/"

ARCHIVOS = {
    "transactions": "transactions.rds",
    "promotions": "promotions.rds",
    "demographics": "demographics.rda",
    "products": "products.rda",
    "campaigns": "campaigns.rda",
    "campaign_descriptions": "campaign_descriptions.rda",
    "coupons": "coupons.rda",
    "coupon_redemptions": "coupon_redemptions.rda",
}

# Huellas versionadas en el repo: quien reproduzca el proyecto descarga exactamente lo mismo.
MANIFIESTO = ML / "datos.sha256.json"


def _sha256(ruta) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(1 << 20), b""):
            h.update(bloque)
    return h.hexdigest()


def descargar(forzar: bool = False) -> dict[str, str]:
    """Descarga los archivos que falten y verifica su huella contra el manifiesto."""
    CRUDOS.mkdir(parents=True, exist_ok=True)
    manifiesto = json.loads(MANIFIESTO.read_text()) if MANIFIESTO.exists() else {}

    for archivo in ARCHIVOS.values():
        destino = CRUDOS / archivo
        if forzar or not destino.exists():
            print(f"Descargando {archivo}...")
            temporal = destino.with_suffix(destino.suffix + ".part")
            urllib.request.urlretrieve(URL_BASE + archivo, temporal)
            temporal.replace(destino)
        huella = _sha256(destino)
        esperada = manifiesto.get(archivo)
        if esperada and esperada != huella:
            raise RuntimeError(
                f"{archivo}: la huella no coincide con datos.sha256.json "
                f"({huella[:12]}… ≠ {esperada[:12]}…). Borra el archivo y vuelve a descargar."
            )
        manifiesto[archivo] = huella

    MANIFIESTO.write_text(json.dumps(manifiesto, indent=2))
    return manifiesto


def convertir() -> None:
    """Convierte los archivos de R a parquet (una tabla por archivo)."""
    PROCESADOS.mkdir(parents=True, exist_ok=True)
    for nombre, archivo in ARCHIVOS.items():
        destino = PROCESADOS / f"{nombre}.parquet"
        if destino.exists():
            continue
        tablas = pyreadr.read_r(str(CRUDOS / archivo))
        df = next(iter(tablas.values()))
        df.to_parquet(destino, index=False)
        print(f"{nombre}: {len(df):,} filas x {df.shape[1]} columnas")


def cargar(nombre: str) -> pd.DataFrame:
    """Lee una tabla ya convertida. Llama antes a `preparar()` si no existe."""
    if nombre not in ARCHIVOS:
        raise KeyError(f"Tabla desconocida: {nombre}. Opciones: {', '.join(ARCHIVOS)}")
    return pd.read_parquet(PROCESADOS / f"{nombre}.parquet")


def preparar(forzar: bool = False) -> None:
    descargar(forzar)
    convertir()


if __name__ == "__main__":
    preparar()
