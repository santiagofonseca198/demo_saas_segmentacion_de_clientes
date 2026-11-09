"use client";

import { create } from "zustand";
import type { PeriodoId } from "@/lib/data/types";

interface EstadoFiltros {
  periodo: PeriodoId;
  /** `null` = todas las zonas. */
  zona: string | null;
  setPeriodo(periodo: PeriodoId): void;
  setZona(zona: string | null): void;
}

/** Filtros que comparten Resumen y Ventas. */
export const useFiltros = create<EstadoFiltros>()((set) => ({
  periodo: "30d",
  zona: null,
  setPeriodo: (periodo) => set({ periodo }),
  setZona: (zona) => set({ zona }),
}));

export const PERIODOS: { id: PeriodoId; nombre: string }[] = [
  { id: "7d", nombre: "Últimos 7 días" },
  { id: "30d", nombre: "Últimos 30 días" },
  { id: "90d", nombre: "Últimos 90 días" },
  { id: "12m", nombre: "Últimos 12 meses" },
];
