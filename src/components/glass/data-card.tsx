import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Superficie de datos: tarjeta casi opaca para gráficas, tablas e indicadores. */
export function DataCard({
  titulo,
  descripcion,
  accion,
  className,
  children,
}: {
  titulo?: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("superficie-datos flex min-w-0 flex-col rounded-2xl p-5", className)}>
      {(titulo || accion) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-base font-semibold leading-snug">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-sm text-ink-2">{descripcion}</p>}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
