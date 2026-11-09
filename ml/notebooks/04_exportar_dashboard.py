# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#   kernelspec:
#     display_name: Python 3
#     language: python
#     name: python3
# ---

# %% [markdown]
# # 04 · Del modelo al producto: exportar al dashboard
#
# Este notebook junta los resultados de los notebooks 02 (segmento de cada hogar al 31-dic) y
# 03 (probabilidad de compra y sus factores) con el historial de compras, y los escribe en
# `public/data/dunnhumby.json`. La app Next.js lo carga desde el preset
# **"Dunnhumby (datos reales)"**.
#
# El archivo reproduce el tipo `Dataset` de `src/lib/data/types.ts`. Como dunnhumby no es una
# PYME, algunas dimensiones se adaptan (y se documentan en el README):
#
# | En la app | Viene de |
# |---|---|
# | Cliente | hogar (`household_id`) |
# | Pedido | cesta (`basket_id`) |
# | Producto | subcategoría (`product_category`, 300+); su categoría es el departamento |
# | Zona | volumen de la tienda principal: las 457 tiendas agrupadas en tercios de la venta |
# | Canal | si la cesta llevó algún descuento ("Con promoción" / "Precio regular") |
# | Promociones usadas | de las últimas 5 campañas recibidas, en cuántas canjeó un cupón |
#
# Para que el archivo pese poco se exporta una **muestra estratificada por segmento** de
# hogares (mismas proporciones que la base completa) con todo su historial.

# %%
import json

import numpy as np
import pandas as pd

from brujula_ml import exportar as E
from brujula_ml import features as F
from brujula_ml import segmentacion as S
from brujula_ml.propension import VENTANA
from brujula_ml.rutas import EXPORT_APP, PROCESADOS

HOGARES = 900
LIMITE_MB = 5.0

tx = F.transacciones()
c = F.cestas(tx)
camp = F.campanas()
f_fin = F.features_en(c, F.FIN, camp)
segmentos = pd.read_parquet(PROCESADOS / "segmentos_fin.parquet")["segmento"]
prop = pd.read_parquet(PROCESADOS / "propension_fin.parquet")
factores = ["frecuencia", "promos", "recencia", "tendencia", "valor"]

datos = E.construir(
    tx,
    c,
    f_fin,
    segmentos,
    probabilidad=prop["probabilidad"],
    aportes=prop[factores],
    intercepto=float(prop["intercepto"].iat[0]),
    campanas_tabla=camp,
    n_hogares=HOGARES,
    ventana=VENTANA,
)
peso = E.guardar(datos)
print(
    f"{EXPORT_APP.relative_to(EXPORT_APP.parents[2])}: {peso / 1e6:.2f} MB · "
    f"{len(datos['clientes'])} clientes · {len(datos['pedidos']):,} pedidos · {len(datos['productos'])} productos"
)
assert peso / 1e6 <= LIMITE_MB, "El JSON supera el límite: baja HOGARES"

# %% [markdown]
# ## Comprobaciones
#
# 1. La muestra mantiene el reparto de segmentos de la base completa.

# %%
muestra = pd.Series([cl["segmento"] for cl in datos["clientes"]])
pd.DataFrame(
    {
        "base completa (%)": segmentos.value_counts(normalize=True) * 100,
        "muestra (%)": muestra.value_counts(normalize=True) * 100,
    }
).reindex(S.SEGMENTOS).round(1)

# %% [markdown]
# 2. La probabilidad de cada cliente es exactamente σ(intercepto + Σ factores): lo que la app
#    muestra como "por qué" suma el puntaje.

# %%
z = np.array([datos["intercepto"] + sum(cl["factores"].values()) for cl in datos["clientes"]])
p = np.array([cl["probabilidad"] for cl in datos["clientes"]])
print(f"Error máximo de reconstrucción: {np.abs(1 / (1 + np.exp(-z)) - p).max():.1e}")

# %% [markdown]
# 3. Las ventas que verá el dashboard cuadran con las cestas originales de esos hogares.

# %%
hogares = [int(cl["nombre"].split()[-1]) for cl in datos["clientes"]]
original = c[c["household_id"].astype(int).isin(hogares) & (c["total"] > 0)]["total"].sum()
exportado = sum(sum(ls[2::3]) for *_, ls in datos["pedidos"]) / 100
print(
    f"Venta original: {original:,.2f} · exportada: {exportado:,.2f} · diferencia {exportado / original - 1:+.3%}"
)

# %%
print(json.dumps(datos["clientes"][0], ensure_ascii=False, indent=1))
