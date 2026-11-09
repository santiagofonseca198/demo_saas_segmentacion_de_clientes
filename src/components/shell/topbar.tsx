"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConsulta } from "@/hooks/use-consulta";
import { ULTIMO_DIA, fechaDeDia } from "@/lib/data/fechas";
import { repositorio } from "@/lib/data/repository";
import type { PeriodoId } from "@/lib/data/types";
import { claveDeDatos, useDemo, useFormato, usePreset } from "@/state/demo";
import { PERIODOS, useFiltros } from "@/state/filtros";
import { todos } from "@/tenants/rubros";
import { seccionDe } from "./navegacion";

const TODAS = "todas";

function Filtros() {
  const preset = usePreset();
  const { periodo, zona, setPeriodo, setZona } = useFiltros();
  const { datos: catalogo } = useConsulta(`catalogo:${claveDeDatos(preset)}`, () =>
    repositorio.catalogo(preset),
  );
  const zonas = catalogo?.zonas ?? [];

  // Si se cambia de empresa, la zona elegida puede dejar de existir.
  useEffect(() => {
    if (catalogo && zona !== null && !catalogo.zonas.includes(zona)) setZona(null);
  }, [catalogo, zona, setZona]);

  const opcionesZona = [
    { value: TODAS, label: todos(preset.vocabulario.zona) },
    ...zonas.map((z) => ({ value: z, label: z })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={PERIODOS.map((p) => ({ value: p.id, label: p.nombre }))}
        value={periodo}
        onValueChange={(valor) => setPeriodo(valor as PeriodoId)}
      >
        <SelectTrigger aria-label="Periodo" className="h-9 bg-white/70">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {PERIODOS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={opcionesZona}
        value={zona !== null && zonas.includes(zona) ? zona : TODAS}
        onValueChange={(valor) => setZona(valor === TODAS ? null : (valor as string))}
      >
        <SelectTrigger aria-label={preset.vocabulario.zona.singular} className="h-9 bg-white/70">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {opcionesZona.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Topbar() {
  const ruta = usePathname();
  const preset = usePreset();
  const formato = useFormato();
  const listo = useDemo((estado) => estado.listo);
  const seccion = seccionDe(ruta);

  return (
    <header className="vidrio-marco no-imprimir sticky top-3 z-10 flex min-h-[68px] flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-3xl px-6 py-3">
      <div className="min-w-0">
        <h1 className="titulo-pagina truncate">{listo ? (seccion?.titulo(preset) ?? (ruta === "/sistema" ? "Sistema visual" : " ")) : " "}</h1>
      </div>
      {listo && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-sm text-ink-2">
            {preset.datos.fuente === "dunnhumby" ? "Datos reales de dunnhumby al " : "Datos al "}
            {formato.fecha(fechaDeDia(ULTIMO_DIA, preset.datos.fechaReferencia), "larga")}
          </p>
          {seccion?.conFiltros && <Filtros />}
        </div>
      )}
    </header>
  );
}
