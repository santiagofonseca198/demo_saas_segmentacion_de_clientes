import type { ReactNode } from "react";

/** Caja de los tooltips de las gráficas: vidrio flotante con texto en tinta. */
export function CajaTooltip({ titulo, children }: { titulo?: ReactNode; children: ReactNode }) {
  return (
    <div className="vidrio-flotante pointer-events-none min-w-[150px] rounded-xl px-3 py-2 text-sm">
      {titulo && <p className="mb-1 font-semibold">{titulo}</p>}
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

export function FilaTooltip({
  muestra,
  etiqueta,
  valor,
}: {
  muestra?: ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <p className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-ink-2">
        {muestra}
        {etiqueta}
      </span>
      <span className="tabular font-semibold">{valor}</span>
    </p>
  );
}
