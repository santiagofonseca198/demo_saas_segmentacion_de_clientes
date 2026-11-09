"""Rutas del proyecto, resueltas desde la ubicación del paquete."""

from pathlib import Path

ML = Path(__file__).resolve().parents[2]
RAIZ = ML.parent
DATOS = ML / "data"
CRUDOS = DATOS / "raw"
PROCESADOS = DATOS / "processed"
MODELOS = ML / "models"
REPORTES = ML / "reports"
FIGURAS = REPORTES / "figures"
EXPORT_APP = RAIZ / "public" / "data" / "dunnhumby.json"
