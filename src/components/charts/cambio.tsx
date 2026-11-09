import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Formato } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cambio frente al periodo anterior: flecha, signo y color, nunca solo color. */
export function Cambio({
  valor,
  formato,
  className,
}: {
  valor: number | null;
  formato: Formato;
  className?: string;
}) {
  if (valor === null) {
    return <span className={cn("text-sm text-ink-2", className)}>Sin periodo anterior</span>;
  }
  const estable = Math.abs(valor) < 0.0005;
  const sube = valor > 0;
  const Icono = estable ? Minus : sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 text-sm font-semibold",
        estable ? "text-ink-2" : sube ? "text-ok-texto" : "text-destructive",
        className,
      )}
    >
      <Icono className="size-4" aria-hidden />
      <span className="sr-only">{estable ? "Sin cambio" : sube ? "Subió" : "Bajó"}</span>
      {formato.cambio(valor)}
    </span>
  );
}
