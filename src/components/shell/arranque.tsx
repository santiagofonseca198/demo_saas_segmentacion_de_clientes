"use client";

import { useEffect } from "react";
import { useDemo } from "@/state/demo";

/**
 * Prepara la sesión: recupera el preset guardado en el navegador, aplica los
 * parámetros de la URL (`?empresa=<id>` y `?demo=1`) y escucha el atajo del
 * panel de demo (Ctrl + punto).
 */
export function Arranque() {
  useEffect(() => {
    const { cargarPreset, abrirPanel, marcarListo } = useDemo.getState();
    Promise.resolve(useDemo.persist.rehydrate()).finally(() => {
      const parametros = new URLSearchParams(window.location.search);
      const empresa = parametros.get("empresa");
      if (empresa) cargarPreset(empresa);
      if (parametros.get("demo") === "1") abrirPanel(true);
      marcarListo();
    });

    const alPulsar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key === ".") {
        evento.preventDefault();
        const estado = useDemo.getState();
        estado.abrirPanel(!estado.panelAbierto);
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  return null;
}
