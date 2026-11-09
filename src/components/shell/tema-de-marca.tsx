"use client";

import { useEffect } from "react";
import { useDemo } from "@/state/demo";

/** Lleva la marca y la apariencia del preset activo a las variables CSS. */
export function TemaDeMarca() {
  const tono = useDemo((estado) => estado.preset.marca.tono);
  const apariencia = useDemo((estado) => estado.preset.apariencia);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty("--brand-h", String(tono));
    raiz.dataset.proyector = String(apariencia.proyector);
    if (apariencia.proyector) {
      // En modo proyector mandan los valores de globals.css.
      raiz.style.removeProperty("--fondo-intensidad");
      raiz.style.removeProperty("--alpha-marco");
    } else {
      raiz.style.setProperty("--fondo-intensidad", apariencia.fondo.toFixed(2));
      // vidrio 0 → marco casi opaco (0.86); vidrio 1 → marco más transparente (0.38).
      raiz.style.setProperty("--alpha-marco", (0.86 - 0.48 * apariencia.vidrio).toFixed(2));
    }
  }, [tono, apariencia]);

  return null;
}
