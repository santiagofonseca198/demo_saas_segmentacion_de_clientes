import type { KpiId } from "@/tenants/schema";
import { DIAS_SEMANA, ULTIMO_DIA, diaSemana, fechaDeDia } from "./fechas";
import type {
  Barra,
  Cliente,
  Dataset,
  Filtros,
  KpiValor,
  Pedido,
  PeriodoId,
  PuntoSerie,
  ResumenSegmento,
} from "./types";
import { SEGMENTOS } from "./types";

export const DIAS_PERIODO: Record<PeriodoId, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

/** En cuántos tramos se parte cada periodo para la gráfica de tendencia. */
const TRAMOS: Record<PeriodoId, number> = { "7d": 7, "30d": 30, "90d": 9, "12m": 12 };
/** Tramos de la mini-tendencia de cada indicador. */
const TRAMOS_MINI: Record<PeriodoId, number> = { "7d": 7, "30d": 10, "90d": 9, "12m": 12 };

/** Rango de días del historial, con ambos extremos incluidos. */
export interface Rango {
  desde: number;
  hasta: number;
}

export function rangos(periodo: PeriodoId): { actual: Rango; anterior: Rango; dias: number } {
  const dias = DIAS_PERIODO[periodo];
  return {
    dias,
    actual: { desde: ULTIMO_DIA - dias + 1, hasta: ULTIMO_DIA },
    anterior: { desde: ULTIMO_DIA - 2 * dias + 1, hasta: ULTIMO_DIA - dias },
  };
}

export function pedidosEn(ds: Dataset, rango: Rango, zona: string | null): Pedido[] {
  return ds.pedidos.filter(
    (p) => p.dia >= rango.desde && p.dia <= rango.hasta && (zona === null || p.zona === zona),
  );
}

const indices = new WeakMap<Dataset, Map<string, Cliente>>();

export function clientePorId(ds: Dataset): Map<string, Cliente> {
  let indice = indices.get(ds);
  if (!indice) {
    indice = new Map(ds.clientes.map((c) => [c.id, c]));
    indices.set(ds, indice);
  }
  return indice;
}

/** Calcula todos los indicadores sobre un grupo de pedidos de un rango. */
export function medir(ds: Dataset, pedidos: Pedido[], rango: Rango): Record<KpiId, number> {
  const clientes = clientePorId(ds);
  const compras = new Map<string, number>();
  let ventas = 0;
  for (const pedido of pedidos) {
    ventas += pedido.total;
    compras.set(pedido.clienteId, (compras.get(pedido.clienteId) ?? 0) + 1);
  }
  let repiten = 0;
  let nuevos = 0;
  for (const [id, cantidad] of compras) {
    const primerDia = clientes.get(id)?.primerDia ?? 0;
    if (primerDia >= rango.desde) nuevos++;
    if (cantidad >= 2) repiten++;
  }
  return {
    ventas,
    pedidos: pedidos.length,
    ticketPromedio: pedidos.length ? ventas / pedidos.length : 0,
    clientesActivos: compras.size,
    tasaRecompra: compras.size ? repiten / compras.size : 0,
    clientesNuevos: nuevos,
  };
}

function cambioRelativo(actual: number, anterior: number): number | null {
  return anterior > 0 ? (actual - anterior) / anterior : null;
}

function tramoDe(dia: number, rango: Rango, tramos: number): number {
  const dias = rango.hasta - rango.desde + 1;
  return Math.min(tramos - 1, Math.floor(((dia - rango.desde) * tramos) / dias));
}

function inicioDeTramo(tramo: number, rango: Rango, tramos: number): number {
  const dias = rango.hasta - rango.desde + 1;
  return rango.desde + Math.ceil((tramo * dias) / tramos);
}

export function calcularKpis(ds: Dataset, filtros: Filtros, ids: KpiId[]): KpiValor[] {
  const { actual, anterior } = rangos(filtros.periodo);
  const pedidosActual = pedidosEn(ds, actual, filtros.zona);
  const medidaActual = medir(ds, pedidosActual, actual);
  const medidaAnterior = medir(ds, pedidosEn(ds, anterior, filtros.zona), anterior);

  const tramos = TRAMOS_MINI[filtros.periodo];
  const porTramo: Pedido[][] = Array.from({ length: tramos }, () => []);
  for (const pedido of pedidosActual) porTramo[tramoDe(pedido.dia, actual, tramos)].push(pedido);
  const medidasPorTramo = porTramo.map((grupo, i) => {
    const desde = inicioDeTramo(i, actual, tramos);
    const hasta = i === tramos - 1 ? actual.hasta : inicioDeTramo(i + 1, actual, tramos) - 1;
    return medir(ds, grupo, { desde, hasta });
  });

  return ids.map((id) => ({
    id,
    valor: medidaActual[id],
    anterior: medidaAnterior[id],
    cambio: cambioRelativo(medidaActual[id], medidaAnterior[id]),
    serie: medidasPorTramo.map((m) => m[id]),
  }));
}

export function serieVentas(ds: Dataset, filtros: Filtros): PuntoSerie[] {
  const { actual, anterior } = rangos(filtros.periodo);
  const tramos = TRAMOS[filtros.periodo];
  const puntos: PuntoSerie[] = Array.from({ length: tramos }, (_, i) => ({
    dia: inicioDeTramo(i, actual, tramos),
    actual: 0,
    anterior: 0,
  }));
  for (const p of pedidosEn(ds, actual, filtros.zona)) {
    puntos[tramoDe(p.dia, actual, tramos)].actual += p.total;
  }
  for (const p of pedidosEn(ds, anterior, filtros.zona)) {
    puntos[tramoDe(p.dia, anterior, tramos)].anterior += p.total;
  }
  return puntos;
}

function ordenar(mapa: Map<string, { valor: number; anterior: number }>): Barra[] {
  return [...mapa.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.valor - a.valor);
}

export type Dimension = "categoria" | "canal" | "zona" | "diaSemana";

/** Ventas del periodo y del periodo anterior, agrupadas por una dimensión. */
export function ventasPor(ds: Dataset, filtros: Filtros, dimension: Dimension): Barra[] {
  const { actual, anterior } = rangos(filtros.periodo);
  const categoriaDe = new Map(ds.productos.map((p) => [p.id, p.categoria]));
  const mapa = new Map<string, { valor: number; anterior: number }>();
  const sumar = (nombre: string, importe: number, campo: "valor" | "anterior") => {
    const fila = mapa.get(nombre) ?? { valor: 0, anterior: 0 };
    fila[campo] += importe;
    mapa.set(nombre, fila);
  };

  if (dimension === "diaSemana") {
    for (const nombre of DIAS_SEMANA) mapa.set(nombre, { valor: 0, anterior: 0 });
  }

  for (const [rango, campo] of [
    [actual, "valor"],
    [anterior, "anterior"],
  ] as const) {
    for (const pedido of pedidosEn(ds, rango, filtros.zona)) {
      if (dimension === "categoria") {
        for (const linea of pedido.lineas) {
          sumar(categoriaDe.get(linea.productoId) ?? "Otros", linea.importe, campo);
        }
      } else if (dimension === "diaSemana") {
        sumar(DIAS_SEMANA[diaSemana(fechaDeDia(pedido.dia, ds.fechaReferencia))], pedido.total, campo);
      } else {
        sumar(pedido[dimension], pedido.total, campo);
      }
    }
  }

  return dimension === "diaSemana"
    ? DIAS_SEMANA.map((nombre) => ({ nombre, ...mapa.get(nombre)! }))
    : ordenar(mapa);
}

export function masVendidos(ds: Dataset, filtros: Filtros, cantidad: number): Barra[] {
  const { actual } = rangos(filtros.periodo);
  const nombreDe = new Map(ds.productos.map((p) => [p.id, p.nombre]));
  const mapa = new Map<string, { valor: number; unidades: number }>();
  for (const pedido of pedidosEn(ds, actual, filtros.zona)) {
    for (const linea of pedido.lineas) {
      const fila = mapa.get(linea.productoId) ?? { valor: 0, unidades: 0 };
      fila.valor += linea.importe;
      fila.unidades += linea.unidades;
      mapa.set(linea.productoId, fila);
    }
  }
  return [...mapa.entries()]
    .map(([id, v]) => ({
      nombre: nombreDe.get(id) ?? id,
      valor: v.valor,
      detalle: `${v.unidades} unidades`,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, cantidad);
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
}

function promedio(valores: number[]): number {
  return valores.length ? valores.reduce((suma, v) => suma + v, 0) / valores.length : 0;
}

export function resumenSegmentos(ds: Dataset): ResumenSegmento[] {
  const ventasTotales = ds.clientes.reduce((suma, c) => suma + c.valor, 0);
  return SEGMENTOS.map((id) => {
    const clientes = ds.clientes.filter((c) => c.segmento === id);
    const ventas = clientes.reduce((suma, c) => suma + c.valor, 0);
    const pedidos = clientes.reduce((suma, c) => suma + c.frecuencia, 0);
    return {
      id,
      clientes: clientes.length,
      parteClientes: ds.clientes.length ? clientes.length / ds.clientes.length : 0,
      ventas,
      parteVentas: ventasTotales ? ventas / ventasTotales : 0,
      ticketPromedio: pedidos ? ventas / pedidos : 0,
      recenciaMediana: mediana(clientes.map((c) => c.recenciaDias)),
      frecuenciaMedia: promedio(clientes.map((c) => c.frecuencia)),
      propensionMedia: promedio(clientes.map((c) => c.propension.puntaje)),
    };
  });
}

/** Clientes ordenados por el valor esperado de su próxima compra. */
export function oportunidades(ds: Dataset): Cliente[] {
  return [...ds.clientes].sort(
    (a, b) => b.propension.valorEsperado - a.propension.valorEsperado,
  );
}

/** Cuántos clientes caen en cada tramo de 10 puntos de probabilidad. */
export function distribucionPuntajes(ds: Dataset): number[] {
  const tramos = Array.from({ length: 10 }, () => 0);
  for (const cliente of ds.clientes) {
    tramos[Math.min(9, Math.floor(cliente.propension.puntaje / 10))]++;
  }
  return tramos;
}

/** Ventas por mes de un cliente en los últimos 12 meses (12 tramos). */
export function historialCliente(ds: Dataset, clienteId: string): PuntoSerie[] {
  const { actual } = rangos("12m");
  const puntos: PuntoSerie[] = Array.from({ length: 12 }, (_, i) => ({
    dia: inicioDeTramo(i, actual, 12),
    actual: 0,
    anterior: 0,
  }));
  for (const pedido of ds.pedidos) {
    if (pedido.clienteId === clienteId && pedido.dia >= actual.desde) {
      puntos[tramoDe(pedido.dia, actual, 12)].actual += pedido.total;
    }
  }
  return puntos;
}
