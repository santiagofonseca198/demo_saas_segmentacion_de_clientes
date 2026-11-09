"use client";

import { SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCTO } from "@/lib/producto";
import { cn } from "@/lib/utils";
import { useDemo, usePreset } from "@/state/demo";
import { LogoEmpresa } from "./logo-empresa";
import { SECCIONES, seccionDe } from "./navegacion";

export function Sidebar() {
  const ruta = usePathname();
  const preset = usePreset();
  const listo = useDemo((estado) => estado.listo);
  const modoDemo = useDemo((estado) => estado.modoDemo);
  const abrirPanel = useDemo((estado) => estado.abrirPanel);
  const sinMovimiento = useReducedMotion();
  const activa = seccionDe(ruta)?.href;

  return (
    <aside className="vidrio-marco no-imprimir fixed inset-y-3 left-3 z-20 flex w-[68px] flex-col rounded-3xl p-3 lg:w-[232px]">
      <div className="flex h-11 items-center gap-3 px-1">
        {listo && (
          <>
            <LogoEmpresa nombre={preset.empresa.nombre} logo={preset.empresa.logo} />
            <span className="hidden min-w-0 truncate text-[15px] font-semibold lg:block">
              {preset.empresa.nombre}
            </span>
          </>
        )}
      </div>

      <nav aria-label="Secciones" className="mt-5 flex flex-col gap-1">
        {SECCIONES.map((seccion) => {
          const Icono = seccion.icono;
          const esActiva = seccion.href === activa;
          const titulo = seccion.titulo(preset);
          return (
            <Link
              key={seccion.href}
              href={seccion.href}
              aria-current={esActiva ? "page" : undefined}
              aria-label={titulo}
              title={titulo}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors active:scale-[0.98]",
                esActiva ? "font-semibold text-ink" : "text-ink-2 hover:bg-white/50 hover:text-ink",
              )}
            >
              {esActiva && (
                <motion.span
                  layoutId="seccion-activa"
                  transition={
                    sinMovimiento ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }
                  }
                  className="absolute inset-0 rounded-xl border border-white bg-white/85 shadow-[0_1px_2px_oklch(0.264_0.038_175/0.06),0_6px_16px_-10px_oklch(0.264_0.038_175/0.25)]"
                />
              )}
              <Icono
                className={cn("relative size-[18px] shrink-0", esActiva && "text-brand-600")}
                aria-hidden
              />
              <span className="relative hidden truncate lg:block">{listo ? titulo : ""}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 px-1">
        <span className="hidden text-xs text-ink-2 lg:block">{PRODUCTO.nombre}</span>
        {modoDemo && (
          <button
            type="button"
            onClick={() => abrirPanel(true)}
            aria-label="Abrir el panel de demo"
            title="Panel de demo (Ctrl + .)"
            className="grid size-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-white/60 hover:text-ink active:scale-[0.97]"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </aside>
  );
}
