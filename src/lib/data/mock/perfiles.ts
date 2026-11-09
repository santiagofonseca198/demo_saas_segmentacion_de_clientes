import type { Rubro } from "@/tenants/schema";
import type { SegmentoId } from "../types";
import type { Rng } from "./rng";

type Rango = [min: number, max: number];

export interface Arquetipo {
  /** Parte de la base de clientes. */
  peso: number;
  /** Pedidos por año mientras el cliente está activo. */
  pedidosAnio: Rango;
  /** Multiplica el tamaño del pedido. */
  tamano: Rango;
  /** Si sigue comprando, su última compra cae dentro de `ultimaCompra`; si no, dejó de comprar hace esos días. */
  sigueComprando: boolean;
  /** Días entre la última compra y la fecha de referencia. */
  ultimaCompra: Rango;
  /** Si se define, el cliente llegó hace entre estos días. */
  altaHace?: Rango;
  promosUsadas: Rango;
}

export interface PerfilRubro {
  zonas: { peso: number; valor: string }[];
  canales: { peso: number; valor: string }[];
  /** Precio base en dólares; el preset lo escala a su moneda. */
  productos: { nombre: string; categoria: string; precio: number; popularidad: number }[];
  /** Peso de venta por día de la semana, de lunes a domingo. */
  pesoDiaSemana: number[];
  lineasPorPedido: Rango;
  unidadesPorLinea: Rango;
  arquetipos: Record<SegmentoId, Arquetipo>;
  nombres(cantidad: number, rng: Rng): string[];
}

const NOMBRES = [
  "Andrea", "Camila", "Daniela", "Valentina", "Mariana", "Laura", "Paula", "Sofía",
  "Carolina", "Natalia", "Juliana", "Gabriela", "Isabel", "Lucía", "Verónica", "Patricia",
  "Andrés", "Carlos", "Felipe", "Santiago", "Juan", "Diego", "Sebastián", "Mateo",
  "Alejandro", "Nicolás", "Javier", "Ricardo", "Fernando", "Luis", "Jorge", "Miguel",
];

const APELLIDOS = [
  "García", "Rodríguez", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez",
  "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Vargas", "Castro", "Rojas",
  "Moreno", "Jiménez", "Herrera", "Medina", "Aguilar", "Ortiz", "Mendoza", "Silva",
  "Cortés", "Guerrero", "Navarro", "Salazar", "Paredes", "Cárdenas",
];

const TIPOS_NEGOCIO = [
  "Minimercado", "Tienda", "Supermercado", "Cafetería", "Restaurante", "Panadería",
  "Autoservicio", "Abarrotes", "Mercado", "Comedor",
];

const NOMBRES_NEGOCIO = [
  "La Esperanza", "El Roble", "San Jorge", "Doña Marta", "El Portal", "Las Palmas",
  "La Economía", "El Progreso", "Santa Elena", "Los Andes", "La Colina", "El Mirador",
  "Buenavista", "La Estación", "Don Pedro", "La Fortuna", "El Trigal", "Villa Nueva",
  "La Cosecha", "El Molino", "San Rafael", "La Pradera", "El Jardín", "Los Pinos",
];

export const PERFILES: Record<Rubro, PerfilRubro> = {
  retail: {
    zonas: [
      { peso: 45, valor: "Centro" },
      { peso: 32, valor: "Norte" },
      { peso: 23, valor: "Sur" },
    ],
    canales: [
      { peso: 55, valor: "Tienda física" },
      { peso: 33, valor: "Tienda en línea" },
      { peso: 12, valor: "WhatsApp" },
    ],
    productos: [
      { nombre: "Juego de sartenes antiadherentes", categoria: "Cocina", precio: 64, popularidad: 6 },
      { nombre: "Set de cuchillos de acero", categoria: "Cocina", precio: 48, popularidad: 5 },
      { nombre: "Tabla de cortar de bambú", categoria: "Cocina", precio: 18, popularidad: 8 },
      { nombre: "Vajilla de cerámica 16 piezas", categoria: "Cocina", precio: 79, popularidad: 4 },
      { nombre: "Juego de sábanas de algodón", categoria: "Textiles", precio: 52, popularidad: 7 },
      { nombre: "Cobija tejida", categoria: "Textiles", precio: 38, popularidad: 6 },
      { nombre: "Toallas de baño (par)", categoria: "Textiles", precio: 26, popularidad: 9 },
      { nombre: "Lámpara de mesa", categoria: "Iluminación", precio: 45, popularidad: 5 },
      { nombre: "Lámpara colgante", categoria: "Iluminación", precio: 88, popularidad: 3 },
      { nombre: "Guirnalda de luces cálidas", categoria: "Iluminación", precio: 16, popularidad: 6 },
      { nombre: "Florero de vidrio soplado", categoria: "Decoración", precio: 29, popularidad: 7 },
      { nombre: "Espejo redondo", categoria: "Decoración", precio: 72, popularidad: 4 },
      { nombre: "Velas aromáticas (trío)", categoria: "Decoración", precio: 22, popularidad: 10 },
      { nombre: "Canastos organizadores", categoria: "Organización", precio: 24, popularidad: 8 },
      { nombre: "Repisa flotante", categoria: "Organización", precio: 34, popularidad: 5 },
      { nombre: "Cajas apilables (set)", categoria: "Organización", precio: 31, popularidad: 6 },
    ],
    pesoDiaSemana: [0.85, 0.88, 0.92, 0.98, 1.15, 1.35, 1.2],
    lineasPorPedido: [1, 3],
    unidadesPorLinea: [1, 2],
    arquetipos: {
      fieles: { peso: 0.24, pedidosAnio: [14, 28], tamano: [1.1, 1.6], sigueComprando: true, ultimaCompra: [0, 45], promosUsadas: [3, 5] },
      prometedores: { peso: 0.2, pedidosAnio: [9, 16], tamano: [0.8, 1.2], sigueComprando: true, ultimaCompra: [0, 60], altaHace: [1, 210], promosUsadas: [1, 4] },
      enRiesgo: { peso: 0.16, pedidosAnio: [7, 15], tamano: [1, 1.5], sigueComprando: false, ultimaCompra: [62, 150], promosUsadas: [0, 2] },
      dormidos: { peso: 0.4, pedidosAnio: [1.5, 4], tamano: [0.6, 1], sigueComprando: false, ultimaCompra: [180, 330], promosUsadas: [0, 1] },
    },
    nombres(cantidad, rng) {
      return Array.from(
        { length: cantidad },
        () => `${rng.elegir(NOMBRES)} ${rng.elegir(APELLIDOS)}`,
      );
    },
  },
  b2b: {
    zonas: [
      { peso: 34, valor: "Zona Centro" },
      { peso: 27, valor: "Zona Norte" },
      { peso: 22, valor: "Zona Sur" },
      { peso: 17, valor: "Zona Oriente" },
    ],
    canales: [
      { peso: 58, valor: "Vendedor" },
      { peso: 27, valor: "Portal de pedidos" },
      { peso: 15, valor: "Teléfono" },
    ],
    productos: [
      { nombre: "Agua 600 ml (caja x24)", categoria: "Bebidas", precio: 9, popularidad: 10 },
      { nombre: "Gaseosa 1,5 L (paca x12)", categoria: "Bebidas", precio: 16, popularidad: 9 },
      { nombre: "Jugo en caja 1 L (caja x12)", categoria: "Bebidas", precio: 19, popularidad: 6 },
      { nombre: "Arroz 1 kg (bulto x25)", categoria: "Abarrotes", precio: 31, popularidad: 9 },
      { nombre: "Aceite 900 ml (caja x12)", categoria: "Abarrotes", precio: 38, popularidad: 7 },
      { nombre: "Azúcar 1 kg (bulto x25)", categoria: "Abarrotes", precio: 27, popularidad: 6 },
      { nombre: "Pasta 500 g (caja x24)", categoria: "Abarrotes", precio: 22, popularidad: 5 },
      { nombre: "Leche larga vida 1 L (caja x12)", categoria: "Lácteos", precio: 15, popularidad: 9 },
      { nombre: "Yogur bebible (caja x24)", categoria: "Lácteos", precio: 21, popularidad: 5 },
      { nombre: "Queso tajado 250 g (caja x10)", categoria: "Lácteos", precio: 33, popularidad: 4 },
      { nombre: "Detergente 1 kg (caja x12)", categoria: "Aseo", precio: 29, popularidad: 6 },
      { nombre: "Papel higiénico (paca x48)", categoria: "Aseo", precio: 24, popularidad: 8 },
      { nombre: "Jabón de loza (caja x24)", categoria: "Aseo", precio: 18, popularidad: 5 },
      { nombre: "Papas fritas 45 g (caja x48)", categoria: "Snacks", precio: 26, popularidad: 8 },
      { nombre: "Galletas surtidas (caja x36)", categoria: "Snacks", precio: 23, popularidad: 7 },
    ],
    pesoDiaSemana: [1.35, 1.25, 1.15, 1.1, 1.05, 0.5, 0.1],
    lineasPorPedido: [3, 7],
    unidadesPorLinea: [2, 12],
    arquetipos: {
      fieles: { peso: 0.24, pedidosAnio: [30, 52], tamano: [1.1, 1.5], sigueComprando: true, ultimaCompra: [0, 30], promosUsadas: [3, 5] },
      prometedores: { peso: 0.2, pedidosAnio: [16, 28], tamano: [0.7, 1.1], sigueComprando: true, ultimaCompra: [0, 50], altaHace: [1, 210], promosUsadas: [1, 4] },
      enRiesgo: { peso: 0.16, pedidosAnio: [16, 30], tamano: [0.9, 1.4], sigueComprando: false, ultimaCompra: [62, 140], promosUsadas: [0, 2] },
      dormidos: { peso: 0.4, pedidosAnio: [2, 6], tamano: [0.5, 0.9], sigueComprando: false, ultimaCompra: [180, 330], promosUsadas: [0, 1] },
    },
    nombres(cantidad, rng) {
      const combinaciones = TIPOS_NEGOCIO.flatMap((tipo) =>
        NOMBRES_NEGOCIO.map((nombre) => `${tipo} ${nombre}`),
      );
      const mezcladas = rng.mezclar(combinaciones);
      return Array.from({ length: cantidad }, (_, i) => {
        const base = mezcladas[i % mezcladas.length];
        const vuelta = Math.floor(i / mezcladas.length);
        return vuelta === 0 ? base : `${base} ${vuelta + 1}`;
      });
    },
  },
};
