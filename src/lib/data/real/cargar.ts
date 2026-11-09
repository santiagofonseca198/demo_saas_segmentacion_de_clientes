import { z } from "zod";
import { bandaDe } from "../propension";
import type { Cliente, Dataset, Factor, FactorId, LineaPedido, Pedido, Producto } from "../types";
import { SEGMENTOS } from "../types";

/**
 * Datos reales exportados por `ml/notebooks/04_exportar_dashboard`.
 *
 * El archivo viene compacto: cada pedido es una fila
 * `[cliente, dia, zona, canal, [producto, unidades, centavos, ...]]` con índices a
 * las tablas de clientes, zonas, canales y productos. Aquí se valida y se
 * convierte al mismo `Dataset` que produce el generador, así que el resto de la
 * app no distingue entre datos simulados y reales.
 */

export const RUTA_DUNNHUMBY = "/data/dunnhumby.json";
export const VERSION_EXPORT = 1;

const FACTORES = ["recencia", "frecuencia", "valor", "promos", "tendencia"] as const satisfies FactorId[];

const esquemaExport = z.object({
  version: z.literal(VERSION_EXPORT),
  fuente: z.string(),
  fechaReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ventanaPropension: z.number().int().positive(),
  intercepto: z.number(),
  zonas: z.array(z.string()).min(1),
  canales: z.array(z.string()).min(1),
  productos: z.array(
    z.object({ id: z.string(), nombre: z.string(), categoria: z.string(), precio: z.number() }),
  ),
  clientes: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      zona: z.string(),
      canal: z.string(),
      segmento: z.enum(SEGMENTOS),
      primerDia: z.number().int(),
      recenciaDias: z.number().int().nonnegative(),
      frecuencia: z.number().int().nonnegative(),
      valor: z.number(),
      ticketPromedio: z.number(),
      promosUsadas: z.number().int().min(0).max(5),
      tendencia: z.number(),
      probabilidad: z.number().min(0).max(1),
      factores: z.record(z.enum(FACTORES), z.number()),
    }),
  ),
  pedidos: z.array(
    z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int(), z.array(z.number())]),
  ),
});

export type ExportDunnhumby = z.infer<typeof esquemaExport>;

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Valida el JSON exportado y lo convierte en un `Dataset`; `escala` cambia de moneda. */
export function desdeExport(entrada: unknown, escala = 1): Dataset {
  const datos = esquemaExport.parse(entrada);

  const productos: Producto[] = datos.productos.map((p) => ({
    ...p,
    precio: redondear(p.precio * escala),
  }));

  const clientes: Cliente[] = datos.clientes.map((c) => {
    const factores: Factor[] = FACTORES.map((id) => ({ id, aporte: c.factores[id] ?? 0 })).sort(
      (a, b) => Math.abs(b.aporte) - Math.abs(a.aporte),
    );
    const puntaje = Math.round(c.probabilidad * 100);
    const ticketPromedio = redondear(c.ticketPromedio * escala);
    return {
      id: c.id,
      nombre: c.nombre,
      zona: c.zona,
      canal: c.canal,
      segmento: c.segmento,
      primerDia: c.primerDia,
      recenciaDias: c.recenciaDias,
      frecuencia: c.frecuencia,
      valor: redondear(c.valor * escala),
      ticketPromedio,
      promosUsadas: c.promosUsadas,
      tendencia: c.tendencia,
      propension: {
        puntaje,
        banda: bandaDe(puntaje),
        valorEsperado: c.probabilidad * ticketPromedio,
        factores,
      },
    };
  });

  const pedidos: Pedido[] = datos.pedidos.map(([cliente, dia, zona, canal, plano], i) => {
    const lineas: LineaPedido[] = [];
    for (let j = 0; j < plano.length; j += 3) {
      lineas.push({
        productoId: productos[plano[j]].id,
        unidades: plano[j + 1],
        importe: redondear((plano[j + 2] / 100) * escala),
      });
    }
    return {
      id: `P-${String(i + 1).padStart(5, "0")}`,
      clienteId: clientes[cliente].id,
      dia,
      total: redondear(lineas.reduce((suma, linea) => suma + linea.importe, 0)),
      zona: datos.zonas[zona],
      canal: datos.canales[canal],
      lineas,
    };
  });
  pedidos.sort((a, b) => a.dia - b.dia);

  return {
    rubro: "retail",
    fechaReferencia: datos.fechaReferencia,
    ventanaPropension: datos.ventanaPropension,
    productos,
    clientes,
    pedidos,
    zonas: datos.zonas,
    canales: datos.canales,
    categorias: [...new Set(productos.map((p) => p.categoria))],
  };
}

/** Descarga el export de dunnhumby (se sirve como archivo estático desde `public/`). */
export async function cargarDunnhumby(escala = 1): Promise<Dataset> {
  const respuesta = await fetch(RUTA_DUNNHUMBY);
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${RUTA_DUNNHUMBY} (${respuesta.status}). Genera el archivo con ml/notebooks/04_exportar_dashboard.`,
    );
  }
  return desdeExport(await respuesta.json(), escala);
}
