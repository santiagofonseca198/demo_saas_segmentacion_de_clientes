import type { Formato } from "@/lib/format";
import type { FuenteDatos, Preset } from "@/tenants/schema";
import type { Banda, Cliente, Factor, SegmentoId } from "./types";

type Vocabulario = Preset["vocabulario"];

export const NOMBRE_BANDA: Record<Banda, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function plural(cantidad: number, termino: { singular: string; plural: string }): string {
  return cantidad === 1 ? termino.singular : termino.plural;
}

/** "hoy", "ayer" o "hace N días". */
export function haceDias(dias: number, formato: Formato): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${formato.numero(dias)} días`;
}

/** Explica en una frase lo que un factor dice del cliente. */
export function textoFactor(
  factor: Factor,
  cliente: Cliente,
  vocabulario: Vocabulario,
  formato: Formato,
): string {
  switch (factor.id) {
    case "recencia": {
      const dias = cliente.recenciaDias;
      if (dias === 0) return "Compró hoy";
      if (dias === 1) return "Compró ayer";
      return factor.aporte >= 0 ? `Compró hace ${dias} días` : `No compra hace ${dias} días`;
    }
    case "frecuencia":
      return `${cliente.frecuencia} ${plural(cliente.frecuencia, vocabulario.pedido)} en el último año`;
    case "valor":
      return `Gastó ${formato.moneda(cliente.valor)} en el último año`;
    case "promos":
      return `Usó ${cliente.promosUsadas} de las últimas 5 promociones`;
    case "tendencia":
      if (factor.aporte > 0.05) return "Compra más que hace tres meses";
      if (factor.aporte < -0.05) return "Compra menos que hace tres meses";
      return "Compra al mismo ritmo que hace tres meses";
  }
}

/** Qué hacer con un cliente según su segmento y su probabilidad de compra. */
export function accionSugerida(cliente: Cliente): string {
  const { banda } = cliente.propension;
  const { segmento } = cliente;
  if (banda === "alta") {
    if (segmento === "fieles") return "Ofrecer novedades o productos complementarios";
    if (segmento === "prometedores") return "Invitar a probar otra categoría";
    return "Contactar esta semana";
  }
  if (banda === "media") {
    return segmento === "enRiesgo"
      ? "Enviar una oferta de regreso"
      : "Enviar un recordatorio con promoción";
  }
  if (segmento === "enRiesgo") return "Llamar para entender por qué dejó de comprar";
  if (segmento === "dormidos") return "Incluir en una campaña de reactivación";
  return "Mantener en la comunicación general";
}

/**
 * Con datos reales los segmentos salen del clustering, no de reglas fijas, y
 * sus perfiles son otros (en un supermercado se vuelve cada pocos días): se
 * describen según lo que el modelo encontró (ml/notebooks/02_segmentacion_svm).
 */
const DESCRIPCION_REAL: Record<SegmentoId, string> = {
  fieles: "Compran casi a diario y hace poco. Sostienen la mayor parte de las ventas.",
  prometedores: "Todavía compran poco, pero su ritmo de compra se está acelerando.",
  enRiesgo: "Compran con regularidad, pero menos que hace tres meses.",
  dormidos: "Hace semanas que no vuelven y, cuando venían, compraban poco.",
};

export function descripcionSegmento(id: SegmentoId, fuente: FuenteDatos = "simulado"): string {
  if (fuente !== "simulado") return DESCRIPCION_REAL[id];
  switch (id) {
    case "fieles":
      return "Compran seguido y hace poco. Sostienen buena parte de las ventas.";
    case "prometedores":
      return "Llegaron hace poco y ya volvieron a comprar.";
    case "enRiesgo":
      return "Compraban con frecuencia y llevan más de dos meses sin volver.";
    case "dormidos":
      return "Compraron pocas veces y no vuelven hace más de seis meses.";
  }
}

export function accionSegmento(id: SegmentoId): string {
  switch (id) {
    case "fieles":
      return "Avisarles primero de las novedades y darles trato preferente.";
    case "prometedores":
      return "Acompañar sus primeras compras para que se vuelvan habituales.";
    case "enRiesgo":
      return "Hacerles llegar esta semana una oferta de regreso.";
    case "dormidos":
      return "Probar una campaña de reactivación de bajo costo.";
  }
}
