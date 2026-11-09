import type { KpiId, Preset, Rubro, Termino } from "./schema";

type PorRubro = Pick<Preset, "vocabulario" | "kpis" | "segmentos">;

/** Vocabulario, indicadores y nombres de segmento con los que arranca cada rubro. */
export const VALORES_POR_RUBRO: Record<Rubro, PorRubro> = {
  retail: {
    vocabulario: {
      cliente: { singular: "cliente", plural: "clientes", genero: "m" },
      pedido: { singular: "compra", plural: "compras", genero: "f" },
      zona: { singular: "sucursal", plural: "sucursales", genero: "f" },
    },
    kpis: ["ventas", "ticketPromedio", "clientesActivos", "tasaRecompra"],
    segmentos: {
      fieles: "Fieles",
      prometedores: "Prometedores",
      enRiesgo: "En riesgo",
      dormidos: "Dormidos",
    },
  },
  b2b: {
    vocabulario: {
      cliente: { singular: "cuenta", plural: "cuentas", genero: "f" },
      pedido: { singular: "pedido", plural: "pedidos", genero: "m" },
      zona: { singular: "zona", plural: "zonas", genero: "f" },
    },
    kpis: ["ventas", "pedidos", "ticketPromedio", "clientesActivos"],
    segmentos: {
      fieles: "Cuentas clave",
      prometedores: "En crecimiento",
      enRiesgo: "En riesgo",
      dormidos: "Inactivas",
    },
  },
};

export const NOMBRE_RUBRO: Record<Rubro, string> = {
  retail: "Retail / tienda",
  b2b: "Distribución B2B",
};

export function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "los clientes" o "las cuentas", según el género del término. */
export function los(termino: Termino): string {
  return `${termino.genero === "f" ? "las" : "los"} ${termino.plural}`;
}

/** "Todos los clientes" o "Todas las zonas". */
export function todos(termino: Termino): string {
  return `${termino.genero === "f" ? "Todas" : "Todos"} ${los(termino)}`;
}

/** Etiqueta de cada indicador según el vocabulario de la empresa. */
export function etiquetaKpi(id: KpiId, preset: Pick<Preset, "vocabulario">): string {
  const { cliente, pedido } = preset.vocabulario;
  switch (id) {
    case "ventas":
      return "Ventas";
    case "pedidos":
      return mayuscula(pedido.plural);
    case "ticketPromedio":
      return `Valor promedio por ${pedido.singular}`;
    case "clientesActivos":
      return `${mayuscula(cliente.plural)} que compraron`;
    case "tasaRecompra":
      return `${mayuscula(cliente.plural)} que repiten`;
    case "clientesNuevos":
      return `${mayuscula(cliente.plural)} por primera vez`;
  }
}
