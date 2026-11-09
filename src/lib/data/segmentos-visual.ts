import type { SegmentoId } from "./types";

export type Forma = "circulo" | "cuadrado" | "triangulo" | "rombo";

/**
 * Cada segmento se distingue por color y por forma. Verde, azul y naranja
 * pasan el validador de daltonismo comparados todos contra todos; el cuarto
 * segmento va en gris neutro porque ningún cuarto tono lo pasaba.
 */
export const SEGMENTO_VISUAL: Record<SegmentoId, { color: string; forma: Forma }> = {
  fieles: { color: "var(--serie-1)", forma: "circulo" },
  prometedores: { color: "var(--serie-2)", forma: "cuadrado" },
  enRiesgo: { color: "var(--serie-3)", forma: "triangulo" },
  dormidos: { color: "var(--neutro)", forma: "rombo" },
};

/** Trazo SVG de cada forma, centrado en (0, 0) y con radio `r`. */
export function trazoDeForma(forma: Forma, r: number): string {
  switch (forma) {
    case "circulo":
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    case "cuadrado": {
      const l = r * 0.86;
      return `M ${-l} ${-l} H ${l} V ${l} H ${-l} Z`;
    }
    case "triangulo":
      return `M 0 ${-r * 1.1} L ${r * 1.05} ${r * 0.8} L ${-r * 1.05} ${r * 0.8} Z`;
    case "rombo":
      return `M 0 ${-r * 1.15} L ${r * 1.15} 0 L 0 ${r * 1.15} L ${-r * 1.15} 0 Z`;
  }
}
