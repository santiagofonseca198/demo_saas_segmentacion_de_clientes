import { cn } from "@/lib/utils";

export interface FilaBarra {
  nombre: string;
  valor: number;
  /** Valor ya formateado que se muestra a la derecha. */
  etiqueta: string;
  detalle?: string;
}

/** Barras horizontales con el valor escrito en cada fila. */
export function BarList({ filas, className }: { filas: FilaBarra[]; className?: string }) {
  const max = Math.max(...filas.map((f) => f.valor), 0) || 1;
  if (filas.length === 0) {
    return <p className="text-sm text-ink-2">No hay ventas en este periodo.</p>;
  }
  return (
    <ul className={cn("grid gap-3.5", className)}>
      {filas.map((fila) => (
        <li key={fila.nombre}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={fila.nombre}>
              {fila.nombre}
            </span>
            <span className="tabular shrink-0 font-semibold">{fila.etiqueta}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1">
              <div
                className="h-full min-w-1 rounded-r-[4px] bg-brand-500"
                style={{ width: `${(fila.valor / max) * 100}%` }}
              />
            </div>
          </div>
          {fila.detalle && <p className="mt-1 text-xs text-ink-2">{fila.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}
