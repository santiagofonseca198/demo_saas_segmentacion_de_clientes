import type { Preset } from "./schema";
import { distribuidoraDemo } from "./presets/distribuidora-demo";
import { dunnhumby } from "./presets/dunnhumby";
import { tiendaDemo } from "./presets/tienda-demo";

/**
 * Presets disponibles. Para preparar la demo de una empresa nueva:
 * copia un archivo de `presets/`, cambia sus valores y agrégalo aquí.
 * Se abre con `?empresa=<id>` o desde el panel de demo.
 */
export const PRESETS: Preset[] = [dunnhumby, tiendaDemo, distribuidoraDemo];

// La demo abre con los datos reales; los presets simulados quedan en el panel de demo.
export const PRESET_POR_DEFECTO = dunnhumby;

export function buscarPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
