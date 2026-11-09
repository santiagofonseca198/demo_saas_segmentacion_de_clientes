import type { Formato } from "@/lib/format";
import type { Preset } from "@/tenants/schema";
import { etiquetaKpi, los, mayuscula } from "@/tenants/rubros";
import {
  calcularKpis,
  masVendidos,
  oportunidades,
  pedidosEn,
  rangos,
  resumenSegmentos,
  serieVentas,
  ventasPor,
} from "./consultas";
import { fechaDeDia } from "./fechas";
import { NOMBRE_BANDA, accionSugerida, plural } from "./textos";
import type { Barra, Dataset, Filtros, PuntoSerie } from "./types";

export type TipoReporte =
  | "resumen-ejecutivo"
  | "cambio-ventas"
  | "clientes-en-riesgo"
  | "plan-semanal";

export type Bloque =
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "kpis"; items: { etiqueta: string; valor: string; cambio: number | null }[] }
  | { tipo: "serie"; titulo: string; puntos: PuntoSerie[] }
  | { tipo: "barras"; titulo: string; items: Barra[] }
  | { tipo: "tabla"; columnas: string[]; numericas: number[]; filas: string[][] }
  | { tipo: "lista"; items: string[] };

export interface Reporte {
  tipo: TipoReporte;
  titulo: string;
  periodo: string;
  /** Lo que el agente va mostrando mientras prepara el reporte. */
  pasos: string[];
  bloques: Bloque[];
}

export interface PlantillaReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
}

export function plantillas(preset: Preset): PlantillaReporte[] {
  const { cliente } = preset.vocabulario;
  return [
    {
      tipo: "resumen-ejecutivo",
      titulo: "Resumen mensual para socios",
      descripcion: "Ventas, productos y estado de la base en una página.",
    },
    {
      tipo: "cambio-ventas",
      titulo: "¿Por qué cambiaron las ventas?",
      descripcion: "Qué categorías, zonas y canales explican la diferencia.",
    },
    {
      tipo: "clientes-en-riesgo",
      titulo: `${mayuscula(cliente.plural)} en riesgo y qué hacer`,
      descripcion: `Quiénes dejaron de comprar y cuánto representan.`,
    },
    {
      tipo: "plan-semanal",
      titulo: "A quién contactar esta semana",
      descripcion: "Lista priorizada por probabilidad y valor esperado.",
    },
  ];
}

/** Decide qué reporte responde mejor una pregunta escrita a mano. */
export function interpretarPregunta(pregunta: string): TipoReporte {
  const texto = pregunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/riesgo|perdi|inactiv|dejaron|dejo de|abandon|fuga/.test(texto)) return "clientes-en-riesgo";
  if (/por que|baj|subi|cambi|cay|cree?ci|diferencia/.test(texto)) return "cambio-ventas";
  if (/contact|llamar|semana|oportunidad|quien|priori/.test(texto)) return "plan-semanal";
  return "resumen-ejecutivo";
}

const MES: Filtros = { periodo: "30d", zona: null };

function periodoEnTexto(ds: Dataset, formato: Formato): string {
  const { actual } = rangos("30d");
  return `${formato.fecha(fechaDeDia(actual.desde, ds.fechaReferencia), "dia")} al ${formato.fecha(
    fechaDeDia(actual.hasta, ds.fechaReferencia),
    "larga",
  )}`;
}

function verboCambio(cambio: number | null, formato: Formato): string {
  if (cambio === null) return "sin periodo anterior con el cual comparar";
  if (Math.abs(cambio) < 0.005) return "prácticamente igual que en los 30 días anteriores";
  return `${formato.porcentaje(Math.abs(cambio), 1)} ${cambio > 0 ? "más" : "menos"} que en los 30 días anteriores`;
}

function resumenEjecutivo(ds: Dataset, preset: Preset, formato: Formato): Bloque[] {
  const { cliente } = preset.vocabulario;
  const kpis = calcularKpis(ds, MES, preset.kpis);
  const [ventas] = calcularKpis(ds, MES, ["ventas"]);
  const productos = masVendidos(ds, MES, 5);
  const categorias = ventasPor(ds, MES, "categoria");
  const segmentos = resumenSegmentos(ds);
  const enRiesgo = segmentos.find((s) => s.id === "enRiesgo")!;
  const fieles = segmentos.find((s) => s.id === "fieles")!;
  const altas = ds.clientes.filter((c) => c.propension.banda === "alta");
  const esperado = altas.reduce((suma, c) => suma + c.propension.valorEsperado, 0);

  return [
    {
      tipo: "parrafo",
      texto: `En los últimos 30 días ${preset.empresa.nombre} vendió ${formato.moneda(
        ventas.valor,
      )}, ${verboCambio(ventas.cambio, formato)}.`,
    },
    {
      tipo: "kpis",
      items: kpis.map((kpi) => ({
        etiqueta: etiquetaKpi(kpi.id, preset),
        valor: formatearKpi(kpi.id, kpi.valor, formato),
        cambio: kpi.cambio,
      })),
    },
    { tipo: "serie", titulo: "Ventas por día", puntos: serieVentas(ds, MES) },
    { tipo: "subtitulo", texto: "Qué se vendió" },
    {
      tipo: "parrafo",
      texto: categorias[0]
        ? `${categorias[0].nombre} fue la categoría con más ventas: ${formato.moneda(
            categorias[0].valor,
          )}, el ${formato.porcentaje(categorias[0].valor / (ventas.valor || 1))} del total.`
        : "No hubo ventas en el periodo.",
    },
    { tipo: "barras", titulo: "Productos más vendidos", items: productos },
    { tipo: "subtitulo", texto: `Cómo están ${los(cliente)}` },
    {
      tipo: "tabla",
      columnas: ["Segmento", mayuscula(cliente.plural), "Parte de las ventas", "Días desde la última compra"],
      numericas: [1, 2, 3],
      filas: segmentos.map((s) => [
        preset.segmentos[s.id],
        formato.numero(s.clientes),
        formato.porcentaje(s.parteVentas),
        formato.numero(s.recenciaMediana),
      ]),
    },
    { tipo: "subtitulo", texto: "Qué recomendamos" },
    {
      tipo: "lista",
      items: [
        `Contactar a ${enRiesgo.clientes} ${plural(enRiesgo.clientes, cliente)} del segmento ${
          preset.segmentos.enRiesgo
        }: representan el ${formato.porcentaje(enRiesgo.parteVentas)} de las ventas del último año.`,
        `Cuidar al segmento ${preset.segmentos.fieles}: con el ${formato.porcentaje(
          fieles.parteClientes,
        )} de la base aporta el ${formato.porcentaje(fieles.parteVentas)} de las ventas.`,
        `Priorizar a ${altas.length} ${plural(altas.length, cliente)} con probabilidad alta de compra: el valor esperado es de ${formato.moneda(
          esperado,
        )} en los próximos ${ds.ventanaPropension} días.`,
      ],
    },
  ];
}

function filasDeCambio(items: Barra[], formato: Formato): string[][] {
  return items.map((item) => {
    const anterior = item.anterior ?? 0;
    const diferencia = item.valor - anterior;
    return [
      item.nombre,
      formato.moneda(item.valor),
      formato.moneda(anterior),
      `${diferencia >= 0 ? "+" : "−"}${formato.moneda(Math.abs(diferencia))}`,
    ];
  });
}

function cambioVentas(ds: Dataset, preset: Preset, formato: Formato): Bloque[] {
  const { cliente, zona } = preset.vocabulario;
  const [ventas] = calcularKpis(ds, MES, ["ventas"]);
  const diferencia = ventas.valor - ventas.anterior;
  const categorias = ventasPor(ds, MES, "categoria");
  const zonas = ventasPor(ds, MES, "zona");
  const canales = ventasPor(ds, MES, "canal");
  const columnas = ["Últimos 30 días", "30 días anteriores", "Diferencia"];

  const { actual, anterior } = rangos("30d");
  const compradoresActual = new Set(pedidosEn(ds, actual, null).map((p) => p.clienteId));
  const gastoAnterior = new Map<string, number>();
  for (const pedido of pedidosEn(ds, anterior, null)) {
    gastoAnterior.set(pedido.clienteId, (gastoAnterior.get(pedido.clienteId) ?? 0) + pedido.total);
  }
  const noVolvieron = [...gastoAnterior.entries()].filter(([id]) => !compradoresActual.has(id));
  const gastoPerdido = noVolvieron.reduce((suma, [, gasto]) => suma + gasto, 0);
  const llegaron = [...compradoresActual].filter((id) => !gastoAnterior.has(id)).length;

  const porDiferencia = [...categorias].sort(
    (a, b) => Math.abs(b.valor - (b.anterior ?? 0)) - Math.abs(a.valor - (a.anterior ?? 0)),
  );
  const principal = porDiferencia[0];

  return [
    {
      tipo: "parrafo",
      texto: `Las ventas de los últimos 30 días fueron ${formato.moneda(ventas.valor)}, frente a ${formato.moneda(
        ventas.anterior,
      )} en los 30 días anteriores: una diferencia de ${diferencia >= 0 ? "+" : "−"}${formato.moneda(
        Math.abs(diferencia),
      )}.`,
    },
    { tipo: "subtitulo", texto: "Por categoría" },
    {
      tipo: "parrafo",
      texto: principal
        ? `La categoría que más movió el resultado fue ${principal.nombre}, con ${formato.moneda(
            Math.abs(principal.valor - (principal.anterior ?? 0)),
          )} ${principal.valor >= (principal.anterior ?? 0) ? "más" : "menos"} que el periodo anterior.`
        : "No hay ventas por categoría en el periodo.",
    },
    { tipo: "tabla", columnas: ["Categoría", ...columnas], numericas: [1, 2, 3], filas: filasDeCambio(categorias, formato) },
    { tipo: "subtitulo", texto: `Por ${zona.singular}` },
    { tipo: "tabla", columnas: [mayuscula(zona.singular), ...columnas], numericas: [1, 2, 3], filas: filasDeCambio(zonas, formato) },
    { tipo: "subtitulo", texto: "Por canal" },
    { tipo: "tabla", columnas: ["Canal", ...columnas], numericas: [1, 2, 3], filas: filasDeCambio(canales, formato) },
    { tipo: "subtitulo", texto: `Movimiento de ${cliente.plural}` },
    {
      tipo: "lista",
      items: [
        `${noVolvieron.length} ${plural(noVolvieron.length, cliente)} que compraron en el periodo anterior no compraron en este. Habían gastado ${formato.moneda(
          gastoPerdido,
        )}.`,
        `${llegaron} ${plural(llegaron, cliente)} compraron en este periodo sin haber comprado en el anterior.`,
      ],
    },
  ];
}

function clientesEnRiesgo(ds: Dataset, preset: Preset, formato: Formato): Bloque[] {
  const { cliente, zona } = preset.vocabulario;
  const enRiesgo = ds.clientes
    .filter((c) => c.segmento === "enRiesgo")
    .sort((a, b) => b.valor - a.valor);
  const gasto = enRiesgo.reduce((suma, c) => suma + c.valor, 0);
  const total = ds.clientes.reduce((suma, c) => suma + c.valor, 0);
  const recuperables = enRiesgo.filter((c) => c.propension.banda !== "baja");

  return [
    {
      tipo: "parrafo",
      texto: `${enRiesgo.length} ${plural(enRiesgo.length, cliente)} compraban con frecuencia y llevan más de 60 días sin volver. En el último año gastaron ${formato.moneda(
        gasto,
      )}, el ${formato.porcentaje(total ? gasto / total : 0)} de las ventas.`,
    },
    { tipo: "subtitulo", texto: "Quiénes pesan más" },
    {
      tipo: "tabla",
      columnas: [mayuscula(cliente.singular), mayuscula(zona.singular), "Días sin comprar", "Gasto en el año", "Probabilidad de compra"],
      numericas: [2, 3, 4],
      filas: enRiesgo.slice(0, 10).map((c) => [
        c.nombre,
        c.zona,
        formato.numero(c.recenciaDias),
        formato.moneda(c.valor),
        formato.porcentaje(c.propension.puntaje / 100),
      ]),
    },
    { tipo: "subtitulo", texto: "Qué hacer" },
    {
      tipo: "lista",
      items: [
        `Empezar por ${recuperables.length} ${plural(recuperables.length, cliente)} con probabilidad media o alta de volver: una oferta de regreso suele bastar.`,
        "Llamar personalmente a quienes más compraban para entender por qué dejaron de hacerlo.",
        "Revisar en un mes cuántos volvieron y ajustar la oferta.",
      ],
    },
  ];
}

function planSemanal(ds: Dataset, preset: Preset, formato: Formato): Bloque[] {
  const { cliente } = preset.vocabulario;
  const altas = ds.clientes.filter((c) => c.propension.banda === "alta");
  const esperado = altas.reduce((suma, c) => suma + c.propension.valorEsperado, 0);
  const lista = oportunidades(ds)
    .filter((c) => c.propension.banda !== "baja")
    .slice(0, 12);

  return [
    {
      tipo: "parrafo",
      texto: `${altas.length} ${plural(altas.length, cliente)} tienen probabilidad alta de comprar en los próximos ${ds.ventanaPropension} días. Si se cumplen las probabilidades, representan ${formato.moneda(
        esperado,
      )} en ventas.`,
    },
    { tipo: "subtitulo", texto: "Por dónde empezar" },
    {
      tipo: "tabla",
      columnas: [mayuscula(cliente.singular), "Segmento", "Probabilidad", "Valor esperado", "Qué hacer"],
      numericas: [2, 3],
      filas: lista.map((c) => [
        c.nombre,
        preset.segmentos[c.segmento],
        `${formato.porcentaje(c.propension.puntaje / 100)} (${NOMBRE_BANDA[c.propension.banda].toLowerCase()})`,
        formato.moneda(c.propension.valorEsperado),
        accionSugerida(c),
      ]),
    },
    {
      tipo: "parrafo",
      texto: `La lista está ordenada por valor esperado: la probabilidad de compra multiplicada por el valor promedio de cada ${cliente.singular}.`,
    },
  ];
}

export function formatearKpi(id: Preset["kpis"][number], valor: number, formato: Formato): string {
  switch (id) {
    case "ventas":
      return formato.moneda(valor, { compacta: true });
    case "ticketPromedio":
      return formato.monedaExacta(valor);
    case "tasaRecompra":
      return formato.porcentaje(valor);
    default:
      return formato.numero(valor);
  }
}

const PASOS: Record<TipoReporte, string[]> = {
  "resumen-ejecutivo": [
    "Consultando las ventas de los últimos 30 días",
    "Comparando con los 30 días anteriores",
    "Revisando productos y segmentos",
    "Redactando el resumen",
  ],
  "cambio-ventas": [
    "Consultando las ventas de los dos periodos",
    "Separando por categoría, zona y canal",
    "Revisando quiénes dejaron de comprar",
    "Redactando la explicación",
  ],
  "clientes-en-riesgo": [
    "Buscando quiénes dejaron de comprar",
    "Calculando cuánto representan",
    "Estimando su probabilidad de volver",
    "Redactando las recomendaciones",
  ],
  "plan-semanal": [
    "Calculando la probabilidad de compra",
    "Estimando el valor esperado",
    "Ordenando la lista de contactos",
    "Redactando el plan",
  ],
};

/** Arma un reporte a partir de los mismos datos y cálculos del tablero. */
export function generarReporte(ds: Dataset, preset: Preset, formato: Formato, tipo: TipoReporte): Reporte {
  const constructores = {
    "resumen-ejecutivo": resumenEjecutivo,
    "cambio-ventas": cambioVentas,
    "clientes-en-riesgo": clientesEnRiesgo,
    "plan-semanal": planSemanal,
  } as const;
  return {
    tipo,
    titulo: plantillas(preset).find((p) => p.tipo === tipo)!.titulo,
    periodo: periodoEnTexto(ds, formato),
    pasos: PASOS[tipo],
    bloques: constructores[tipo](ds, preset, formato),
  };
}
