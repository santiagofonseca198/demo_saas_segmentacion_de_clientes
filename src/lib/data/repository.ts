import { crearFormato } from "@/lib/format";
import { MONEDAS, type Preset } from "@/tenants/schema";
import {
  calcularKpis,
  clientePorId,
  distribucionPuntajes,
  historialCliente,
  masVendidos,
  oportunidades,
  pedidosEn,
  rangos,
  resumenSegmentos,
  serieVentas,
  ventasPor,
} from "./consultas";
import { hallazgos, type Hallazgo } from "./hallazgos";
import { generarDataset } from "./mock/generador";
import { cargarDunnhumby } from "./real/cargar";
import { generarReporte, type Reporte, type TipoReporte } from "./reportes";
import type {
  Barra,
  Cliente,
  Dataset,
  Filtros,
  KpiValor,
  PuntoSerie,
  ResumenSegmento,
} from "./types";

/**
 * Única puerta de acceso a los datos. Las pantallas solo llaman a estas
 * funciones; responden con datos generados en el navegador o con los datos
 * reales que exportan los modelos de `ml/`, según `preset.datos.fuente`.
 * Cuando exista el backend, cada una pasa a ser una llamada a la API sin
 * tocar las pantallas.
 */

const datasets = new Map<string, Promise<Dataset>>();

function datasetDe(preset: Preset): Promise<Dataset> {
  const { rubro, moneda, datos } = preset;
  const escala = MONEDAS[moneda].escala;
  const clave =
    datos.fuente === "simulado"
      ? [rubro, moneda, datos.semilla, datos.clientes, datos.fechaReferencia].join("|")
      : [datos.fuente, moneda].join("|");
  let ds = datasets.get(clave);
  if (!ds) {
    ds =
      datos.fuente === "simulado"
        ? Promise.resolve(generarDataset({ rubro, ...datos, escala }))
        : cargarDunnhumby(escala);
    // Si la descarga falla, no se guarda el error: el siguiente intento vuelve a pedirla.
    ds.catch(() => datasets.delete(clave));
    if (datasets.size >= 6) datasets.delete(datasets.keys().next().value!);
    datasets.set(clave, ds);
  }
  return ds;
}

export interface Catalogo {
  zonas: string[];
  canales: string[];
  categorias: string[];
  fechaReferencia: string;
}

export interface DatosResumen {
  kpis: KpiValor[];
  serie: PuntoSerie[];
  masVendidos: Barra[];
  segmentos: ResumenSegmento[];
  oportunidades: Cliente[];
  hallazgos: Hallazgo[];
}

export interface FilaPedido {
  id: string;
  dia: number;
  cliente: string;
  zona: string;
  canal: string;
  unidades: number;
  total: number;
}

export interface DatosVentas {
  kpis: KpiValor[];
  serie: PuntoSerie[];
  porCategoria: Barra[];
  porCanal: Barra[];
  porZona: Barra[];
  porDiaSemana: Barra[];
  /** Todos los pedidos del periodo, del más reciente al más antiguo. */
  pedidos: FilaPedido[];
}

export interface DatosSegmentos {
  segmentos: ResumenSegmento[];
  clientes: Cliente[];
}

export interface DatosOportunidades {
  clientes: Cliente[];
  distribucion: number[];
  /** Probabilidad media de la banda alta: "de cada 10, compran N". */
  aciertoBandaAlta: number;
  valorEsperadoAlta: number;
  /** Días hacia adelante que mira la probabilidad de compra. */
  ventanaDias: number;
}

export interface DatosCliente {
  cliente: Cliente;
  historial: PuntoSerie[];
  ventanaDias: number;
}

export const repositorio = {
  async catalogo(preset: Preset): Promise<Catalogo> {
    const ds = await datasetDe(preset);
    return {
      zonas: ds.zonas,
      canales: ds.canales,
      categorias: ds.categorias,
      fechaReferencia: ds.fechaReferencia,
    };
  },

  async resumen(preset: Preset, filtros: Filtros): Promise<DatosResumen> {
    const ds = await datasetDe(preset);
    return {
      kpis: calcularKpis(ds, filtros, preset.kpis),
      serie: serieVentas(ds, filtros),
      masVendidos: masVendidos(ds, filtros, 6),
      segmentos: resumenSegmentos(ds),
      oportunidades: oportunidades(ds).slice(0, 5),
      hallazgos: hallazgos(ds, filtros, preset, crearFormato(preset.moneda)),
    };
  },

  async ventas(preset: Preset, filtros: Filtros): Promise<DatosVentas> {
    const ds = await datasetDe(preset);
    const clientes = clientePorId(ds);
    const pedidos = pedidosEn(ds, rangos(filtros.periodo).actual, filtros.zona);
    return {
      kpis: calcularKpis(ds, filtros, ["ventas", "pedidos", "ticketPromedio"]),
      serie: serieVentas(ds, filtros),
      porCategoria: ventasPor(ds, filtros, "categoria"),
      porCanal: ventasPor(ds, filtros, "canal"),
      porZona: ventasPor(ds, filtros, "zona"),
      porDiaSemana: ventasPor(ds, filtros, "diaSemana"),
      pedidos: [...pedidos]
        .reverse()
        .map((p) => ({
          id: p.id,
          dia: p.dia,
          cliente: clientes.get(p.clienteId)?.nombre ?? p.clienteId,
          zona: p.zona,
          canal: p.canal,
          unidades: p.lineas.reduce((suma, linea) => suma + linea.unidades, 0),
          total: p.total,
        })),
    };
  },

  async segmentos(preset: Preset): Promise<DatosSegmentos> {
    const ds = await datasetDe(preset);
    return { segmentos: resumenSegmentos(ds), clientes: ds.clientes };
  },

  async oportunidades(preset: Preset): Promise<DatosOportunidades> {
    const ds = await datasetDe(preset);
    const altas = ds.clientes.filter((c) => c.propension.banda === "alta");
    return {
      clientes: oportunidades(ds),
      distribucion: distribucionPuntajes(ds),
      aciertoBandaAlta: altas.length
        ? altas.reduce((suma, c) => suma + c.propension.puntaje, 0) / altas.length / 100
        : 0,
      valorEsperadoAlta: altas.reduce((suma, c) => suma + c.propension.valorEsperado, 0),
      ventanaDias: ds.ventanaPropension,
    };
  },

  async cliente(preset: Preset, id: string): Promise<DatosCliente | null> {
    const ds = await datasetDe(preset);
    const cliente = clientePorId(ds).get(id);
    return cliente
      ? { cliente, historial: historialCliente(ds, id), ventanaDias: ds.ventanaPropension }
      : null;
  },

  async reporte(preset: Preset, tipo: TipoReporte): Promise<Reporte> {
    return generarReporte(await datasetDe(preset), preset, crearFormato(preset.moneda), tipo);
  },
};
