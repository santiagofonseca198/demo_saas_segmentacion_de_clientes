"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { crearFormato } from "@/lib/format";
import { PRESET_POR_DEFECTO, buscarPreset } from "@/tenants";
import { VALORES_POR_RUBRO } from "@/tenants/rubros";
import { validarPreset, type Preset, type ResultadoPreset, type Rubro } from "@/tenants/schema";

interface EstadoDemo {
  /** Preset activo: lo que define a la empresa que se está mostrando. */
  preset: Preset;
  /** `false` hasta leer lo guardado en el navegador; evita mostrar otra empresa por un instante. */
  listo: boolean;
  panelAbierto: boolean;
  /** Se activa al abrir el panel por primera vez; deja visible su botón en la barra lateral. */
  modoDemo: boolean;
  cargarPreset(id: string): boolean;
  actualizar(cambio: (preset: Preset) => Preset): void;
  /** Cambia de rubro y trae su vocabulario, indicadores y segmentos por defecto. */
  cambiarRubro(rubro: Rubro): void;
  importar(entrada: unknown): ResultadoPreset;
  restablecer(): void;
  abrirPanel(abierto: boolean): void;
  marcarListo(): void;
}

export const useDemo = create<EstadoDemo>()(
  persist(
    (set, get) => ({
      preset: PRESET_POR_DEFECTO,
      listo: false,
      panelAbierto: false,
      modoDemo: false,
      cargarPreset(id) {
        const preset = buscarPreset(id);
        if (!preset) return false;
        set({ preset });
        return true;
      },
      actualizar(cambio) {
        const resultado = validarPreset(cambio(get().preset));
        // Un cambio que deja el preset inválido (por ejemplo, un nombre vacío) no se aplica.
        if (resultado.ok) set({ preset: resultado.preset });
      },
      cambiarRubro(rubro) {
        set({ preset: { ...get().preset, rubro, ...VALORES_POR_RUBRO[rubro] } });
      },
      importar(entrada) {
        const resultado = validarPreset(entrada);
        if (resultado.ok) set({ preset: resultado.preset });
        return resultado;
      },
      restablecer() {
        set({ preset: buscarPreset(get().preset.id) ?? PRESET_POR_DEFECTO });
      },
      abrirPanel(abierto) {
        set(abierto ? { panelAbierto: true, modoDemo: true } : { panelAbierto: false });
      },
      marcarListo() {
        set({ listo: true });
      },
    }),
    {
      name: "demo:preset:v1",
      skipHydration: true,
      partialize: (estado) => ({ preset: estado.preset }),
      merge: (guardado, actual) => {
        const resultado = validarPreset((guardado as { preset?: unknown } | undefined)?.preset);
        return resultado.ok ? { ...actual, preset: resultado.preset } : actual;
      },
    },
  ),
);

export function usePreset(): Preset {
  return useDemo((estado) => estado.preset);
}

export function useFormato() {
  return crearFormato(useDemo((estado) => estado.preset.moneda));
}

/** Cambia solo cuando cambia algo que afecta a los datos, no la apariencia. */
export function claveDeDatos(preset: Preset): string {
  const { rubro, moneda, datos, kpis, vocabulario, segmentos, empresa } = preset;
  return JSON.stringify([rubro, moneda, datos, kpis, vocabulario, segmentos, empresa.nombre]);
}
