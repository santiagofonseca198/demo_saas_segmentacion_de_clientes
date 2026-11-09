import type { Preset } from "../schema";
import { VALORES_POR_RUBRO } from "../rubros";

/**
 * Datos reales: dunnhumby The Complete Journey (2017), con segmentos y
 * propensión calculados por los modelos de `ml/` y exportados a
 * `public/data/dunnhumby.json`. La semilla no se usa con esta fuente.
 */
export const dunnhumby: Preset = {
  id: "dunnhumby",
  empresa: { nombre: "Supermercado dunnhumby", logo: null },
  marca: { tono: 150 },
  rubro: "retail",
  moneda: "USD",
  ...VALORES_POR_RUBRO.retail,
  vocabulario: {
    cliente: { singular: "hogar", plural: "hogares", genero: "m" },
    pedido: { singular: "compra", plural: "compras", genero: "f" },
    zona: { singular: "tipo de tienda", plural: "tipos de tienda", genero: "m" },
  },
  datos: { semilla: 0, clientes: 900, fechaReferencia: "2017-12-31", fuente: "dunnhumby" },
  apariencia: { fondo: 0.55, vidrio: 0.5, proyector: false },
};
