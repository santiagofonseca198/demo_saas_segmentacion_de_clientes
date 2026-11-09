/** Generador pseudoaleatorio con semilla (mulberry32): misma semilla, mismos datos. */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number;
  /** Decimal en [min, max). */
  rango(min: number, max: number): number;
  elegir<T>(lista: readonly T[]): T;
  ponderado<T>(opciones: readonly { peso: number; valor: T }[]): T;
  mezclar<T>(lista: readonly T[]): T[];
}

export function crearRng(semilla: number): Rng {
  let estado = semilla >>> 0;
  const next = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    rango: (min, max) => min + next() * (max - min),
    elegir: (lista) => lista[int(0, lista.length - 1)],
    ponderado: (opciones) => {
      const total = opciones.reduce((suma, o) => suma + o.peso, 0);
      let corte = next() * total;
      for (const opcion of opciones) {
        corte -= opcion.peso;
        if (corte < 0) return opcion.valor;
      }
      return opciones[opciones.length - 1].valor;
    },
    mezclar: (lista) => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
