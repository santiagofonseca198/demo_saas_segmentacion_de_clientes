import type { Banda, Factor, Propension } from "./types";

/**
 * Puntaje de propensión simulado: una regresión logística con pesos fijos.
 * No es un modelo entrenado, pero se comporta como uno: cada factor aporta al
 * puntaje de forma aditiva, así que lo que se muestra como "por qué" explica
 * de verdad el número.
 */
const INTERCEPTO = -1.6;

const PESOS = {
  recencia: 1.15,
  frecuencia: 0.75,
  valor: 0.3,
  promos: 0.5,
  tendencia: 0.7,
} as const;

export const CORTE_ALTA = 60;
export const CORTE_MEDIA = 30;

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

export interface EntradaPropension {
  recenciaDias: number;
  frecuencia: number;
  valor: number;
  ticketPromedio: number;
  promosUsadas: number;
  tendencia: number;
}

export interface Referencias {
  frecuenciaMediana: number;
  valorMediano: number;
}

export function bandaDe(puntaje: number): Banda {
  if (puntaje >= CORTE_ALTA) return "alta";
  if (puntaje >= CORTE_MEDIA) return "media";
  return "baja";
}

export function calcularPropension(
  cliente: EntradaPropension,
  referencias: Referencias,
): Propension {
  const aportes: Factor[] = [
    {
      id: "recencia",
      aporte: PESOS.recencia * limitar((60 - cliente.recenciaDias) / 90, -1.5, 0.67),
    },
    {
      id: "frecuencia",
      aporte:
        PESOS.frecuencia *
        limitar(Math.log2((cliente.frecuencia + 1) / (referencias.frecuenciaMediana + 1)), -2, 2),
    },
    {
      id: "valor",
      aporte:
        PESOS.valor *
        limitar(Math.log2((cliente.valor + 1) / (referencias.valorMediano + 1)), -2, 2),
    },
    {
      id: "promos",
      aporte: PESOS.promos * ((cliente.promosUsadas - 2) / 2),
    },
    {
      id: "tendencia",
      aporte: PESOS.tendencia * limitar(cliente.tendencia - 1, -1, 1),
    },
  ];

  const z = aportes.reduce((suma, factor) => suma + factor.aporte, INTERCEPTO);
  const probabilidad = 1 / (1 + Math.exp(-z));
  const puntaje = Math.round(probabilidad * 100);

  return {
    puntaje,
    banda: bandaDe(puntaje),
    valorEsperado: probabilidad * cliente.ticketPromedio,
    factores: aportes.sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte)),
  };
}
