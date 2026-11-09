import { describe, expect, it } from "vitest";
import { contrasteConBlanco } from "@/lib/theme/brand";
import { PRESETS } from "./index";
import { validarPreset } from "./schema";

describe("presets", () => {
  it.each(PRESETS)("$id cumple el esquema", (preset) => {
    expect(validarPreset(preset)).toEqual({ ok: true, preset });
  });

  it("los ids no se repiten", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("rechaza un preset inválido y dice qué campo falla", () => {
    const roto = {
      ...PRESETS[0],
      empresa: { nombre: "", logo: null },
      marca: { tono: 500 },
      kpis: ["ventas"],
    };
    const resultado = validarPreset(roto);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.join("\n")).toContain("empresa.nombre: La empresa necesita un nombre");
    expect(resultado.errores.some((e) => e.startsWith("marca.tono"))).toBe(true);
    expect(resultado.errores.join("\n")).toContain("kpis: Elige al menos dos indicadores");
  });

  it("rechaza algo que no es un preset", () => {
    expect(validarPreset("hola").ok).toBe(false);
    expect(validarPreset(null).ok).toBe(false);
  });
});

describe("rampa de marca", () => {
  it("el texto blanco sobre el color de botones cumple 4.5:1 con cualquier tono", () => {
    for (let tono = 0; tono < 360; tono++) {
      expect(contrasteConBlanco(tono, 600), `tono ${tono}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
