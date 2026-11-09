import { NOMBRE_BANDA } from "@/lib/data/textos";
import type { Banda } from "@/lib/data/types";
import type { Formato } from "@/lib/format";
import { cn } from "@/lib/utils";

const NIVEL: Record<Banda, number> = { baja: 1, media: 2, alta: 3 };

/** Banda de probabilidad: tres barras que se llenan según el nivel, más el nombre. */
export function EtiquetaBanda({ banda, className }: { banda: Banda; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((nivel) => (
          <span
            key={nivel}
            style={{ height: 4 + nivel * 3 }}
            className={cn(
              "w-[3px] rounded-[1px]",
              nivel <= NIVEL[banda] ? "bg-brand-600" : "bg-ink/15",
            )}
          />
        ))}
      </span>
      {NOMBRE_BANDA[banda]}
    </span>
  );
}

/** Probabilidad de compra de 0 a 100: la cifra y un medidor sobre su propia rampa. */
export function MedidorProbabilidad({
  puntaje,
  formato,
  className,
}: {
  puntaje: number;
  formato: Formato;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="tabular w-10 shrink-0 text-right font-semibold">
        {formato.porcentaje(puntaje / 100)}
      </span>
      <span
        className="h-1.5 w-full min-w-12 max-w-24 overflow-hidden rounded-full bg-brand-100"
        aria-hidden
      >
        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${puntaje}%` }} />
      </span>
    </span>
  );
}
