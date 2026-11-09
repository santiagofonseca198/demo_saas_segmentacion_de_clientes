import type { Preset } from "../schema";
import { VALORES_POR_RUBRO } from "../rubros";

export const distribuidoraDemo: Preset = {
  id: "distribuidora-demo",
  empresa: { nombre: "Distribuidora Andina", logo: null },
  marca: { tono: 195 },
  rubro: "b2b",
  moneda: "USD",
  ...VALORES_POR_RUBRO.b2b,
  datos: { semilla: 20293, clientes: 180, fechaReferencia: "2026-09-30" },
  apariencia: { fondo: 0.55, vidrio: 0.5, proyector: false },
};
