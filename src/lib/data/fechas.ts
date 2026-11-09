/** Días de historial que se generan: dos años, para poder comparar 12 meses contra los 12 anteriores. */
export const HISTORIAL_DIAS = 730;
export const ULTIMO_DIA = HISTORIAL_DIAS - 1;

const DIA_MS = 86_400_000;

function msDeReferencia(fechaReferencia: string): number {
  const [anio, mes, dia] = fechaReferencia.split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

/** Fecha (UTC) de un día del historial; el último día es la fecha de referencia. */
export function fechaDeDia(dia: number, fechaReferencia: string): Date {
  return new Date(msDeReferencia(fechaReferencia) - (ULTIMO_DIA - dia) * DIA_MS);
}

/** Día de la semana con lunes = 0 y domingo = 6. */
export function diaSemana(fecha: Date): number {
  return (fecha.getUTCDay() + 6) % 7;
}

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
