import type { KpiId, Rubro } from "@/tenants/schema";

export type SegmentoId = "fieles" | "prometedores" | "enRiesgo" | "dormidos";
export const SEGMENTOS: SegmentoId[] = ["fieles", "prometedores", "enRiesgo", "dormidos"];

export type Banda = "alta" | "media" | "baja";
export type PeriodoId = "7d" | "30d" | "90d" | "12m";
export type FactorId = "recencia" | "frecuencia" | "valor" | "promos" | "tendencia";

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
}

export interface LineaPedido {
  productoId: string;
  unidades: number;
  importe: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  /** Días desde el inicio del historial (0 = día más antiguo). */
  dia: number;
  total: number;
  canal: string;
  zona: string;
  lineas: LineaPedido[];
}

export interface Factor {
  id: FactorId;
  /** Aporte al puntaje en log-odds: positivo sube la probabilidad, negativo la baja. */
  aporte: number;
}

export interface Propension {
  /** Probabilidad de compra en los próximos 30 días, de 0 a 100. */
  puntaje: number;
  banda: Banda;
  valorEsperado: number;
  /** Ordenados de mayor a menor peso. */
  factores: Factor[];
}

export interface Cliente {
  id: string;
  nombre: string;
  zona: string;
  canal: string;
  segmento: SegmentoId;
  /** Día del historial en que hizo su primera compra. */
  primerDia: number;
  /** Días desde la última compra. */
  recenciaDias: number;
  /** Pedidos en los últimos 12 meses. */
  frecuencia: number;
  /** Gasto en los últimos 12 meses. */
  valor: number;
  ticketPromedio: number;
  /** Cuántas de las últimas 5 promociones usó. */
  promosUsadas: number;
  /** Pedidos de los últimos 90 días frente a los 90 anteriores (1 = igual). */
  tendencia: number;
  propension: Propension;
}

export interface Dataset {
  rubro: Rubro;
  fechaReferencia: string;
  productos: Producto[];
  clientes: Cliente[];
  /** Ordenados por día. */
  pedidos: Pedido[];
  zonas: string[];
  canales: string[];
  categorias: string[];
}

export interface Filtros {
  periodo: PeriodoId;
  /** `null` = todas las zonas. */
  zona: string | null;
}

export interface KpiValor {
  id: KpiId;
  valor: number;
  anterior: number;
  /** Cambio relativo frente al periodo anterior; `null` si no hay base. */
  cambio: number | null;
  serie: number[];
}

export interface PuntoSerie {
  /** Día del historial en que empieza el tramo. */
  dia: number;
  actual: number;
  anterior: number;
}

export interface Barra {
  nombre: string;
  valor: number;
  anterior?: number;
  detalle?: string;
}

export interface ResumenSegmento {
  id: SegmentoId;
  clientes: number;
  parteClientes: number;
  ventas: number;
  parteVentas: number;
  ticketPromedio: number;
  recenciaMediana: number;
  frecuenciaMedia: number;
  propensionMedia: number;
}
