import { MONEDAS, type MonedaId } from "@/tenants/schema";

export type EstiloFecha = "dia" | "diaSemana" | "mes" | "larga";

export interface Formato {
  /** Importe sin decimales; con `compacta`, los millones se abrevian. */
  moneda(valor: number, opciones?: { compacta?: boolean }): string;
  /** Importe abreviado para ejes de gráficas: $12 mil, $1,2 M. */
  monedaCorta(valor: number): string;
  /** Importe con los decimales propios de la moneda (precios, valores promedio). */
  monedaExacta(valor: number): string;
  numero(valor: number, decimales?: number): string;
  /** Número sin separador de miles, para exportar a hojas de cálculo. */
  plano(valor: number): string;
  /** `valor` entre 0 y 1. */
  porcentaje(valor: number, decimales?: number): string;
  /** Cambio relativo con signo: +12 %, −4 %. */
  cambio(valor: number): string;
  fecha(fecha: Date, estilo: EstiloFecha): string;
}

const FECHAS: Record<EstiloFecha, Intl.DateTimeFormatOptions> = {
  dia: { day: "numeric", month: "short" },
  diaSemana: { weekday: "short", day: "numeric" },
  mes: { month: "short" },
  larga: { day: "numeric", month: "long", year: "numeric" },
};

const cache = new Map<MonedaId, Formato>();

export function crearFormato(moneda: MonedaId): Formato {
  const existente = cache.get(moneda);
  if (existente) return existente;

  const { locale, escala } = MONEDAS[moneda];
  const base = { style: "currency", currency: moneda, currencyDisplay: "narrowSymbol" } as const;
  const entera = new Intl.NumberFormat(locale, { ...base, maximumFractionDigits: 0 });
  const compacta = new Intl.NumberFormat(locale, {
    ...base,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const decimalesMoneda = escala >= 10 ? 0 : 2;
  const exacta = new Intl.NumberFormat(locale, {
    ...base,
    minimumFractionDigits: decimalesMoneda,
    maximumFractionDigits: decimalesMoneda,
  });
  const signo = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });
  const fechas = Object.fromEntries(
    Object.entries(FECHAS).map(([estilo, opciones]) => [
      estilo,
      new Intl.DateTimeFormat(locale, { ...opciones, timeZone: "UTC" }),
    ]),
  ) as Record<EstiloFecha, Intl.DateTimeFormat>;

  const formato: Formato = {
    moneda: (valor, opciones) =>
      opciones?.compacta && Math.abs(valor) >= 1_000_000
        ? compacta.format(valor)
        : entera.format(valor),
    monedaCorta: (valor) => (Math.abs(valor) >= 1000 ? compacta.format(valor) : entera.format(valor)),
    monedaExacta: (valor) => exacta.format(valor),
    numero: (valor, decimales = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: decimales }).format(valor),
    plano: (valor) =>
      new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 2 }).format(valor),
    porcentaje: (valor, decimales = 0) =>
      new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: decimales }).format(
        valor,
      ),
    cambio: (valor) => signo.format(valor),
    fecha: (fecha, estilo) => fechas[estilo].format(fecha).replace(/\.$/, ""),
  };
  cache.set(moneda, formato);
  return formato;
}
