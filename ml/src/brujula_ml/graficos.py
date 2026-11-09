"""Estilo de las figuras, alineado con el sistema visual del dashboard."""

from __future__ import annotations

import json

import matplotlib.pyplot as plt

from .rutas import FIGURAS, REPORTES

# Mismos colores y formas que src/lib/data/segmentos-visual.ts y globals.css.
COLOR = {
    "fieles": "#129e74",
    "prometedores": "#2a78d6",
    "enRiesgo": "#eb6834",
    "dormidos": "#7c8b86",
}
FORMA = {"fieles": "o", "prometedores": "s", "enRiesgo": "^", "dormidos": "D"}
NOMBRE = {
    "fieles": "Fieles",
    "prometedores": "Prometedores",
    "enRiesgo": "En riesgo",
    "dormidos": "Dormidos",
}
TINTA = "#1f3a36"
TINTA_2 = "#5b6f6b"
MARCA = "#129e74"
BASE = "#9aa8a4"


def estilo() -> None:
    plt.rcParams.update(
        {
            "figure.dpi": 110,
            "figure.figsize": (8, 4.2),
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.edgecolor": "#c9d3d0",
            "axes.labelcolor": TINTA_2,
            "axes.titlecolor": TINTA,
            "axes.titlesize": 12,
            "axes.titleweight": "bold",
            "axes.titlelocation": "left",
            "axes.grid": True,
            "grid.color": "#e6ecea",
            "grid.linewidth": 0.8,
            "xtick.color": TINTA_2,
            "ytick.color": TINTA_2,
            "legend.frameon": False,
            "font.size": 10,
        }
    )


def guardar(fig, nombre: str) -> None:
    FIGURAS.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIGURAS / f"{nombre}.png", bbox_inches="tight", dpi=130, facecolor="white")


def guardar_metricas(seccion: str, valores: dict) -> None:
    """Actualiza una sección de reports/metricas.json (lo citan los README)."""
    ruta = REPORTES / "metricas.json"
    todo = json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {}
    todo[seccion] = {
        k: round(float(v), 4) if isinstance(v, float) else v for k, v in valores.items()
    }
    ruta.write_text(json.dumps(todo, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
