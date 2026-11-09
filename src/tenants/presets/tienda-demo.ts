import type { Preset } from "../schema";
import { VALORES_POR_RUBRO } from "../rubros";

export const tiendaDemo: Preset = {
  id: "tienda-demo",
  empresa: { nombre: "Casa Laurel", logo: null },
  marca: { tono: 166 },
  rubro: "retail",
  moneda: "USD",
  ...VALORES_POR_RUBRO.retail,
  datos: { semilla: 20279, clientes: 480, fechaReferencia: "2026-09-30" },
  apariencia: { fondo: 0.55, vidrio: 0.5, proyector: false },
};
