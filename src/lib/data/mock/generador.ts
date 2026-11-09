import type { Rubro } from "@/tenants/schema";
import { HISTORIAL_DIAS, ULTIMO_DIA, diaSemana, fechaDeDia } from "../fechas";
import { calcularPropension } from "../propension";
import type { Cliente, Dataset, LineaPedido, Pedido, Producto, SegmentoId } from "../types";
import { SEGMENTOS } from "../types";
import { PERFILES } from "./perfiles";
import { crearRng } from "./rng";

export interface ConfigDatos {
  rubro: Rubro;
  semilla: number;
  clientes: number;
  fechaReferencia: string;
  /** Factor que lleva los precios base (en dólares) a la moneda del preset. */
  escala: number;
}

/** Peso de venta por mes, de enero a diciembre. */
const PESO_MES = [0.86, 0.9, 0.96, 0.98, 1.04, 1, 0.97, 1, 1.02, 1.05, 1.14, 1.34];

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
}

function precioEnMoneda(precioBase: number, escala: number): number {
  const precio = precioBase * escala;
  if (escala >= 100) return Math.round(precio / 100) * 100;
  if (escala >= 10) return Math.round(precio);
  return Math.round(precio * 100) / 100;
}

/**
 * Genera el conjunto de datos de una empresa. Es determinista: la misma
 * configuración produce siempre los mismos clientes y pedidos.
 *
 * Los clientes nacen de un arquetipo de segmento (fieles, prometedores, en
 * riesgo, dormidos) y sus pedidos se reparten en el tiempo según ese
 * arquetipo, así que la segmentación que se muestra es coherente con el
 * historial de compras.
 */
export function generarDataset(config: ConfigDatos): Dataset {
  const rng = crearRng(config.semilla);
  const perfil = PERFILES[config.rubro];

  const productos: Producto[] = perfil.productos.map((p, i) => ({
    id: `PR-${String(i + 1).padStart(2, "0")}`,
    nombre: p.nombre,
    categoria: p.categoria,
    precio: precioEnMoneda(p.precio, config.escala),
  }));
  const productosPonderados = perfil.productos.map((p, i) => ({
    peso: p.popularidad,
    valor: productos[i],
  }));

  // Estacionalidad: día de la semana, mes y una tendencia de crecimiento suave.
  const pesoDia = Array.from({ length: HISTORIAL_DIAS }, (_, dia) => {
    const fecha = fechaDeDia(dia, config.fechaReferencia);
    const tendencia = 0.9 + 0.2 * (dia / ULTIMO_DIA);
    return perfil.pesoDiaSemana[diaSemana(fecha)] * PESO_MES[fecha.getUTCMonth()] * tendencia;
  });
  const pesoMaximo = Math.max(...pesoDia);

  const elegirDia = (desde: number, hasta: number): number => {
    for (let intento = 0; intento < 40; intento++) {
      const dia = rng.int(desde, hasta);
      if (rng.next() < pesoDia[dia] / pesoMaximo) return dia;
    }
    return rng.int(desde, hasta);
  };

  const arquetipos = SEGMENTOS.map((id) => ({ peso: perfil.arquetipos[id].peso, valor: id }));
  const nombres = perfil.nombres(config.clientes, rng);
  const pedidos: Pedido[] = [];
  const base: {
    id: string;
    nombre: string;
    zona: string;
    canal: string;
    segmento: SegmentoId;
    promosUsadas: number;
    dias: number[];
  }[] = [];

  for (let i = 0; i < config.clientes; i++) {
    const segmento = rng.ponderado(arquetipos);
    const arquetipo = perfil.arquetipos[segmento];
    const id = `C-${String(i + 1).padStart(4, "0")}`;
    const zona = rng.ponderado(perfil.zonas);
    const canal = rng.ponderado(perfil.canales);
    const tamano = rng.rango(...arquetipo.tamano);

    // Ventana en la que el cliente compra: desde que llegó hasta que dejó de comprar.
    const fin = arquetipo.sigueComprando
      ? ULTIMO_DIA
      : ULTIMO_DIA - rng.int(...arquetipo.ultimaCompra);
    const inicio = arquetipo.altaHace
      ? ULTIMO_DIA - rng.int(...arquetipo.altaHace)
      : rng.next() < 0.88
        ? 0
        : rng.int(0, 300);
    const anios = (fin - inicio + 1) / 365;
    const cantidad = Math.max(
      arquetipo.altaHace ? 2 : 1,
      Math.round(rng.rango(...arquetipo.pedidosAnio) * anios),
    );

    const dias = Array.from({ length: cantidad }, () => elegirDia(inicio, fin));
    dias.sort((a, b) => a - b);
    // Quien llegó hace poco hizo su primera compra el día que llegó.
    if (arquetipo.altaHace) dias[0] = inicio;
    // La última compra define la recencia: se ajusta para que respete el arquetipo.
    const ultima = dias.length - 1;
    if (!arquetipo.sigueComprando) {
      dias[ultima] = fin;
    } else if (dias[ultima] < ULTIMO_DIA - arquetipo.ultimaCompra[1]) {
      dias[ultima] = Math.max(inicio, ULTIMO_DIA - rng.int(...arquetipo.ultimaCompra));
    }
    dias.sort((a, b) => a - b);

    for (const dia of dias) {
      const lineas: LineaPedido[] = [];
      const cantidadLineas = Math.max(1, Math.round(rng.rango(...perfil.lineasPorPedido) * tamano));
      for (let l = 0; l < cantidadLineas; l++) {
        const producto = rng.ponderado(productosPonderados);
        const unidades = rng.int(...perfil.unidadesPorLinea);
        lineas.push({ productoId: producto.id, unidades, importe: producto.precio * unidades });
      }
      pedidos.push({
        id: "",
        clienteId: id,
        dia,
        total: lineas.reduce((suma, linea) => suma + linea.importe, 0),
        canal: rng.next() < 0.78 ? canal : rng.ponderado(perfil.canales),
        zona,
        lineas,
      });
    }

    base.push({
      id,
      nombre: nombres[i],
      zona,
      canal,
      segmento,
      promosUsadas: rng.int(...arquetipo.promosUsadas),
      dias,
    });
  }

  pedidos.sort((a, b) => a.dia - b.dia || a.clienteId.localeCompare(b.clienteId));
  pedidos.forEach((pedido, i) => {
    pedido.id = `P-${String(i + 1).padStart(5, "0")}`;
  });

  // Métricas por cliente sobre los últimos 12 meses.
  const inicioAnio = ULTIMO_DIA - 364;
  const gastoAnual = new Map<string, number>();
  const gastoTotal = new Map<string, number>();
  for (const pedido of pedidos) {
    gastoTotal.set(pedido.clienteId, (gastoTotal.get(pedido.clienteId) ?? 0) + pedido.total);
    if (pedido.dia >= inicioAnio) {
      gastoAnual.set(pedido.clienteId, (gastoAnual.get(pedido.clienteId) ?? 0) + pedido.total);
    }
  }

  const metricas = base.map((cliente) => {
    const frecuencia = cliente.dias.filter((dia) => dia >= inicioAnio).length;
    const valor = gastoAnual.get(cliente.id) ?? 0;
    const recientes = cliente.dias.filter((dia) => dia > ULTIMO_DIA - 90).length;
    const previos = cliente.dias.filter(
      (dia) => dia > ULTIMO_DIA - 180 && dia <= ULTIMO_DIA - 90,
    ).length;
    return {
      primerDia: cliente.dias[0],
      recenciaDias: ULTIMO_DIA - cliente.dias[cliente.dias.length - 1],
      frecuencia,
      valor,
      ticketPromedio:
        frecuencia > 0 ? valor / frecuencia : (gastoTotal.get(cliente.id) ?? 0) / cliente.dias.length,
      tendencia: (recientes + 1) / (previos + 1),
    };
  });

  const referencias = {
    frecuenciaMediana: mediana(metricas.map((m) => m.frecuencia)),
    valorMediano: mediana(metricas.map((m) => m.valor)),
  };

  const clientes: Cliente[] = base.map((cliente, i) => {
    const m = metricas[i];
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      zona: cliente.zona,
      canal: cliente.canal,
      segmento: cliente.segmento,
      promosUsadas: cliente.promosUsadas,
      ...m,
      propension: calcularPropension({ ...m, promosUsadas: cliente.promosUsadas }, referencias),
    };
  });

  return {
    rubro: config.rubro,
    fechaReferencia: config.fechaReferencia,
    productos,
    clientes,
    pedidos,
    zonas: perfil.zonas.map((z) => z.valor),
    canales: perfil.canales.map((c) => c.valor),
    categorias: [...new Set(productos.map((p) => p.categoria))],
  };
}
