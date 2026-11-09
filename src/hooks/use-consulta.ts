"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ejecuta una consulta del repositorio y la repite cuando cambia `clave`.
 * Mientras llega la respuesta nueva conserva la anterior, para que la
 * pantalla no parpadee al cambiar un filtro.
 */
export function useConsulta<T>(clave: string, consulta: () => Promise<T>) {
  const [estado, setEstado] = useState<{ clave: string; datos: T } | null>(null);
  const ultimaConsulta = useRef(consulta);

  useEffect(() => {
    ultimaConsulta.current = consulta;
  });

  useEffect(() => {
    let vigente = true;
    ultimaConsulta.current().then((datos) => {
      if (vigente) setEstado({ clave, datos });
    });
    return () => {
      vigente = false;
    };
  }, [clave]);

  return { datos: estado?.datos ?? null, cargando: estado?.clave !== clave };
}
