import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarPreset } from "@/tenants";
import { ULTIMO_DIA } from "../fechas";
import { repositorio } from "../repository";
import { SEGMENTOS } from "../types";
import { desdeExport, VERSION_EXPORT, type ExportDunnhumby } from "./cargar";

const factores = (recencia: number, frecuencia: number) => ({
  recencia,
  frecuencia,
  valor: 0.1,
  promos: 0,
  tendencia: -0.05,
});

const cliente = (id: string, segmento: (typeof SEGMENTOS)[number], probabilidad: number, f: ReturnType<typeof factores>) => ({
  id,
  nombre: `Hogar ${id}`,
  zona: "Tiendas de alto volumen",
  canal: "Con promoción",
  segmento,
  primerDia: 365,
  recenciaDias: 3,
  frecuencia: 40,
  valor: 1200,
  ticketPromedio: 30,
  promosUsadas: 1,
  tendencia: 1.1,
  probabilidad,
  factores: f,
});

/** σ(0,5 + Σ factores) = probabilidad, como garantiza el export. */
const sigma = (z: number) => 1 / (1 + Math.exp(-z));
const MINIMO: ExportDunnhumby = {
  version: VERSION_EXPORT,
  fuente: "prueba",
  fechaReferencia: "2017-12-31",
  ventanaPropension: 14,
  intercepto: 0.5,
  zonas: ["Tiendas de alto volumen", "Otras"],
  canales: ["Con promoción", "Precio regular"],
  productos: [
    { id: "PR-001", nombre: "Leche", categoria: "Abarrotes", precio: 2.5 },
    { id: "PR-002", nombre: "Pan", categoria: "Panadería", precio: 1.2 },
  ],
  clientes: [
    cliente("1", "fieles", sigma(0.5 + 1.35), factores(0.4, 0.9)),
    cliente("2", "prometedores", sigma(0.5 + 0.05), factores(0.2, -0.2)),
    cliente("3", "enRiesgo", sigma(0.5 - 0.65), factores(-0.4, -0.3)),
    cliente("4", "dormidos", sigma(0.5 - 2.15), factores(-1.2, -1.0)),
  ],
  pedidos: [
    [0, 700, 0, 0, [0, 2, 500, 1, 1, 120]],
    [3, 400, 1, 1, [1, 3, 360]],
  ],
};

describe("cargador de datos reales", () => {
  it("convierte el export compacto en un Dataset", () => {
    const ds = desdeExport(MINIMO);
    expect(ds.ventanaPropension).toBe(14);
    expect(ds.categorias).toEqual(["Abarrotes", "Panadería"]);
    expect(ds.pedidos.map((p) => p.dia)).toEqual([400, 700]);
    const [primero] = ds.pedidos.filter((p) => p.clienteId === "1");
    expect(primero.total).toBe(6.2);
    expect(primero.lineas).toEqual([
      { productoId: "PR-001", unidades: 2, importe: 5 },
      { productoId: "PR-002", unidades: 1, importe: 1.2 },
    ]);
  });

  it("el puntaje sale de la suma de los factores y la banda usa los cortes de la app", () => {
    const ds = desdeExport(MINIMO);
    for (const c of ds.clientes) {
      const z = MINIMO.intercepto + c.propension.factores.reduce((suma, f) => suma + f.aporte, 0);
      expect(Math.round(sigma(z) * 100)).toBe(c.propension.puntaje);
      const aportes = c.propension.factores.map((f) => Math.abs(f.aporte));
      expect(aportes).toEqual([...aportes].sort((a, b) => b - a));
    }
    expect(ds.clientes.map((c) => c.propension.banda)).toEqual(["alta", "alta", "media", "baja"]);
  });

  it("aplica la escala de la moneda a precios e importes", () => {
    const ds = desdeExport(MINIMO, 1000);
    expect(ds.productos[0].precio).toBe(2500);
    expect(ds.clientes[0].valor).toBe(1_200_000);
    expect(ds.pedidos[1].total).toBe(6200);
  });

  it("rechaza un archivo con otra versión o campos rotos", () => {
    expect(() => desdeExport({ ...MINIMO, version: 99 })).toThrow();
    expect(() => desdeExport({ ...MINIMO, clientes: [{ id: "x" }] })).toThrow();
  });
});

const ARCHIVO = join(process.cwd(), "public", "data", "dunnhumby.json");

describe.skipIf(!existsSync(ARCHIVO))("export real de dunnhumby", () => {
  const crudo = JSON.parse(readFileSync(ARCHIVO, "utf8"));

  afterEach(() => vi.unstubAllGlobals());

  it("pasa la validación y respeta las invariantes del Dataset", () => {
    const ds = desdeExport(crudo);
    expect(new Set(ds.clientes.map((c) => c.segmento))).toEqual(new Set(SEGMENTOS));
    expect(ds.pedidos.every((p) => p.dia >= 0 && p.dia <= ULTIMO_DIA)).toBe(true);
    expect(Math.max(...ds.pedidos.map((p) => p.dia))).toBe(ULTIMO_DIA);
    const ids = new Set(ds.clientes.map((c) => c.id));
    expect(ds.pedidos.every((p) => ids.has(p.clienteId))).toBe(true);
  });

  it("todas las consultas del repositorio responden con el preset real", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(crudo)));
    const preset = buscarPreset("dunnhumby")!;
    const resumen = await repositorio.resumen(preset, { periodo: "90d", zona: null });
    expect(resumen.kpis.every((k) => Number.isFinite(k.valor))).toBe(true);
    const anual = await repositorio.resumen(preset, { periodo: "12m", zona: null });
    // Solo hay un año de datos: no hay periodo anterior con el que comparar.
    expect(anual.kpis.every((k) => k.cambio === null || Number.isFinite(k.cambio))).toBe(true);
    const oportunidades = await repositorio.oportunidades(preset);
    expect(oportunidades.ventanaDias).toBe(14);
    const segmentos = await repositorio.segmentos(preset);
    expect(segmentos.segmentos.reduce((suma, s) => suma + s.clientes, 0)).toBe(preset.datos.clientes);
    const ventas = await repositorio.ventas(preset, { periodo: "30d", zona: null });
    expect(ventas.pedidos.length).toBeGreaterThan(0);
    for (const tipo of ["resumen-ejecutivo", "cambio-ventas", "clientes-en-riesgo", "plan-semanal"] as const) {
      await expect(repositorio.reporte(preset, tipo)).resolves.toBeTruthy();
    }
  });
});
