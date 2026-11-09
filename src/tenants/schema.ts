import { z } from "zod";

export const KPI_IDS = [
  "ventas",
  "pedidos",
  "ticketPromedio",
  "clientesActivos",
  "tasaRecompra",
  "clientesNuevos",
] as const;
export type KpiId = (typeof KPI_IDS)[number];

export const RUBROS = ["retail", "b2b"] as const;
/** De dónde salen los datos: generados en el navegador o exportados por los modelos de `ml/`. */
export const FUENTES = ["simulado", "dunnhumby"] as const;
export type FuenteDatos = (typeof FUENTES)[number];
export type Rubro = (typeof RUBROS)[number];

/**
 * Monedas disponibles. `escala` convierte los precios base del catálogo
 * (pensados en dólares) a un orden de magnitud creíble en cada moneda.
 */
export const MONEDAS = {
  USD: { nombre: "Dólar (USD)", locale: "es-419", escala: 1 },
  COP: { nombre: "Peso colombiano (COP)", locale: "es-CO", escala: 4000 },
  MXN: { nombre: "Peso mexicano (MXN)", locale: "es-MX", escala: 18 },
  PEN: { nombre: "Sol peruano (PEN)", locale: "es-PE", escala: 3.7 },
  CLP: { nombre: "Peso chileno (CLP)", locale: "es-CL", escala: 950 },
  ARS: { nombre: "Peso argentino (ARS)", locale: "es-AR", escala: 1000 },
  EUR: { nombre: "Euro (EUR)", locale: "es-ES", escala: 0.9 },
} as const;
export type MonedaId = keyof typeof MONEDAS;
const MONEDA_IDS = Object.keys(MONEDAS) as [MonedaId, ...MonedaId[]];

const termino = z.object({
  singular: z.string().min(1, "Falta el singular").max(24),
  plural: z.string().min(1, "Falta el plural").max(24),
  /** Género gramatical, para concordar artículos: "los clientes", "las cuentas". */
  genero: z.enum(["m", "f"]),
});
export type Termino = z.infer<typeof termino>;

export const esquemaPreset = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Usa solo minúsculas, números y guiones"),
  empresa: z.object({
    nombre: z.string().min(1, "La empresa necesita un nombre").max(40),
    /** Imagen como data URL o ruta pública. `null` usa el monograma. */
    logo: z.string().nullable(),
  }),
  marca: z.object({
    /** Tono de marca en grados (OKLCH). */
    tono: z.number().min(0).max(360),
  }),
  rubro: z.enum(RUBROS),
  moneda: z.enum(MONEDA_IDS),
  vocabulario: z.object({
    cliente: termino,
    pedido: termino,
    zona: termino,
  }),
  kpis: z
    .array(z.enum(KPI_IDS))
    .min(2, "Elige al menos dos indicadores")
    .max(4, "Elige máximo cuatro indicadores"),
  segmentos: z.object({
    fieles: z.string().min(1).max(24),
    prometedores: z.string().min(1).max(24),
    enRiesgo: z.string().min(1).max(24),
    dormidos: z.string().min(1).max(24),
  }),
  datos: z.object({
    semilla: z.number().int(),
    clientes: z.number().int().min(60).max(1500),
    /** Último día con datos, en formato AAAA-MM-DD. */
    fechaReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa AAAA-MM-DD"),
    /** Los presets guardados antes de existir este campo son simulados. */
    fuente: z.enum(FUENTES).default("simulado"),
  }),
  apariencia: z.object({
    /** 0 = fondo plano, 1 = halos de luz más visibles. */
    fondo: z.number().min(0).max(1),
    /** 0 = marco casi opaco, 1 = marco más transparente. */
    vidrio: z.number().min(0).max(1),
    proyector: z.boolean(),
  }),
});

export type Preset = z.infer<typeof esquemaPreset>;

export type ResultadoPreset =
  | { ok: true; preset: Preset }
  | { ok: false; errores: string[] };

/** Valida un preset que viene de fuera (archivo importado o almacenamiento). */
export function validarPreset(entrada: unknown): ResultadoPreset {
  const resultado = esquemaPreset.safeParse(entrada);
  if (resultado.success) return { ok: true, preset: resultado.data };
  return {
    ok: false,
    errores: resultado.error.issues.map((issue) => {
      const campo = issue.path.join(".");
      return campo ? `${campo}: ${issue.message}` : issue.message;
    }),
  };
}
