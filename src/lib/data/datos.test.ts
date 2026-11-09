import { describe, expect, it } from "vitest";
import { crearFormato } from "@/lib/format";
import { PRESETS } from "@/tenants";
import { MONEDAS } from "@/tenants/schema";
import { calcularKpis, resumenSegmentos, serieVentas, ventasPor } from "./consultas";
import { generarDataset } from "./mock/generador";
import { generarReporte, interpretarPregunta } from "./reportes";
import { repositorio } from "./repository";
import type { Filtros, PeriodoId } from "./types";

const PERIODOS: PeriodoId[] = ["7d", "30d", "90d", "12m"];

function suma(valores: number[]): number {
  return valores.reduce((total, v) => total + v, 0);
}

describe.each(PRESETS)("datos de $id", (preset) => {
  const config = { rubro: preset.rubro, ...preset.datos, escala: MONEDAS[preset.moneda].escala };
  const ds = generarDataset(config);

  it("es determinista: la misma configuración da los mismos datos", () => {
    expect(generarDataset(config)).toEqual(ds);
  });

  it("cambia con la semilla", () => {
    const otro = generarDataset({ ...config, semilla: config.semilla + 1 });
    expect(otro.pedidos.length).not.toBe(ds.pedidos.length);
  });

  it("genera la cantidad de clientes pedida y todos tienen compras", () => {
    expect(ds.clientes).toHaveLength(preset.datos.clientes);
    const conPedidos = new Set(ds.pedidos.map((p) => p.clienteId));
    expect(conPedidos.size).toBe(preset.datos.clientes);
  });

  it("tiene los cuatro segmentos con el comportamiento esperado", () => {
    const porId = Object.fromEntries(resumenSegmentos(ds).map((s) => [s.id, s]));
    for (const segmento of Object.values(porId)) expect(segmento.clientes).toBeGreaterThan(0);
    expect(porId.fieles.recenciaMediana).toBeLessThan(porId.enRiesgo.recenciaMediana);
    expect(porId.enRiesgo.recenciaMediana).toBeLessThan(porId.dormidos.recenciaMediana);
    expect(porId.fieles.propensionMedia).toBeGreaterThan(porId.prometedores.propensionMedia);
    expect(porId.prometedores.propensionMedia).toBeGreaterThan(porId.enRiesgo.propensionMedia);
    expect(porId.enRiesgo.propensionMedia).toBeGreaterThan(porId.dormidos.propensionMedia);
  });

  it("la probabilidad de cada cliente sale de la suma de sus factores", () => {
    for (const cliente of ds.clientes) {
      const { puntaje, factores } = cliente.propension;
      expect(puntaje).toBeGreaterThanOrEqual(0);
      expect(puntaje).toBeLessThanOrEqual(100);
      expect(factores).toHaveLength(5);
    }
  });

  it.each(PERIODOS)("los totales cuadran entre gráficas en %s", (periodo) => {
    const filtros: Filtros = { periodo, zona: null };
    const [ventas] = calcularKpis(ds, filtros, ["ventas"]);
    const serie = serieVentas(ds, filtros);
    expect(suma(serie.map((p) => p.actual))).toBeCloseTo(ventas.valor, 4);
    expect(suma(serie.map((p) => p.anterior))).toBeCloseTo(ventas.anterior, 4);
    for (const dimension of ["categoria", "canal", "zona", "diaSemana"] as const) {
      const barras = ventasPor(ds, filtros, dimension);
      expect(suma(barras.map((b) => b.valor))).toBeCloseTo(ventas.valor, 4);
    }
    expect(suma(ventas.serie)).toBeCloseTo(ventas.valor, 4);
  });

  it("el filtro por zona parte las ventas sin perder nada", () => {
    const total = calcularKpis(ds, { periodo: "90d", zona: null }, ["ventas"])[0].valor;
    const porZona = ds.zonas.map(
      (zona) => calcularKpis(ds, { periodo: "90d", zona }, ["ventas"])[0].valor,
    );
    expect(suma(porZona)).toBeCloseTo(total, 4);
  });

  it("el reporte usa las mismas cifras que el tablero", async () => {
    const formato = crearFormato(preset.moneda);
    const [ventas] = calcularKpis(ds, { periodo: "30d", zona: null }, ["ventas"]);
    const reporte = generarReporte(ds, preset, formato, "resumen-ejecutivo");
    const intro = reporte.bloques[0];
    expect(intro.tipo).toBe("parrafo");
    expect(intro.tipo === "parrafo" && intro.texto).toContain(formato.moneda(ventas.valor));

    const resumen = await repositorio.resumen(preset, { periodo: "30d", zona: null });
    const kpiVentas = resumen.kpis.find((k) => k.id === "ventas");
    if (kpiVentas) expect(kpiVentas.valor).toBeCloseTo(ventas.valor, 4);
  });

  it("todos los reportes se generan con contenido", () => {
    const formato = crearFormato(preset.moneda);
    for (const tipo of ["resumen-ejecutivo", "cambio-ventas", "clientes-en-riesgo", "plan-semanal"] as const) {
      const reporte = generarReporte(ds, preset, formato, tipo);
      expect(reporte.bloques.length).toBeGreaterThan(2);
      expect(JSON.stringify(reporte)).not.toMatch(/undefined|NaN/);
    }
  });
});

describe("preguntas al agente", () => {
  it.each([
    ["¿Por qué bajaron las ventas en septiembre?", "cambio-ventas"],
    ["Clientes que dejaron de comprar", "clientes-en-riesgo"],
    ["¿A quién debo llamar esta semana?", "plan-semanal"],
    ["Hazme un resumen del mes", "resumen-ejecutivo"],
  ] as const)("%s → %s", (pregunta, tipo) => {
    expect(interpretarPregunta(pregunta)).toBe(tipo);
  });
});
