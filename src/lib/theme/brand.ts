/**
 * Rampa de marca derivada de un tono (0–360, en OKLCH).
 *
 * Los mismos valores de luminosidad y saturación están en globals.css como
 * `oklch(L C var(--brand-h))`. Este módulo existe para dos cosas que el CSS no
 * puede hacer: entregar hex a quien lo necesite y comprobar el contraste en
 * las pruebas.
 */

export const PASOS_MARCA = {
  700: { l: 0.44, c: 0.09 },
  600: { l: 0.52, c: 0.105 },
  500: { l: 0.62, c: 0.125 },
  200: { l: 0.9, c: 0.05 },
  100: { l: 0.95, c: 0.025 },
  50: { l: 0.975, c: 0.012 },
} as const;

export type PasoMarca = keyof typeof PASOS_MARCA;

export const TONO_POR_DEFECTO = 166;

type Rgb = [number, number, number];

function aGamma(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

/** OKLCH → sRGB lineal, recortado al rango visible. */
export function oklchARgbLineal(l: number, c: number, h: number): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb: Rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return rgb.map((v) => Math.min(1, Math.max(0, v))) as Rgb;
}

export function oklchAHex(l: number, c: number, h: number): string {
  return (
    "#" +
    oklchARgbLineal(l, c, h)
      .map((v) =>
        Math.round(aGamma(v) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function colorDeMarca(tono: number, paso: PasoMarca): string {
  const { l, c } = PASOS_MARCA[paso];
  return oklchAHex(l, c, tono);
}

function luminancia([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG de texto blanco sobre un paso de la rampa. */
export function contrasteConBlanco(tono: number, paso: PasoMarca): number {
  const { l, c } = PASOS_MARCA[paso];
  return 1.05 / (luminancia(oklchARgbLineal(l, c, tono)) + 0.05);
}

/** Tonos sugeridos en el panel de demo. */
export const TONOS_SUGERIDOS: { nombre: string; tono: number }[] = [
  { nombre: "Verde", tono: 166 },
  { nombre: "Aqua", tono: 195 },
  { nombre: "Azul", tono: 250 },
  { nombre: "Violeta", tono: 295 },
  { nombre: "Magenta", tono: 350 },
  { nombre: "Rojo", tono: 25 },
  { nombre: "Naranja", tono: 55 },
  { nombre: "Oliva", tono: 125 },
];
