import { SEGMENTO_VISUAL, trazoDeForma } from "@/lib/data/segmentos-visual";
import type { ResumenSegmento, SegmentoId } from "@/lib/data/types";
import type { Formato } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Preset } from "@/tenants/schema";

/** Marca de un segmento: color y forma, para no depender solo del color. */
export function MarcaSegmento({ id, className }: { id: SegmentoId; className?: string }) {
  const { color, forma } = SEGMENTO_VISUAL[id];
  return (
    <svg viewBox="-7 -7 14 14" className={cn("size-3 shrink-0", className)} aria-hidden>
      <path d={trazoDeForma(forma, 5.2)} fill={color} />
    </svg>
  );
}

export function EtiquetaSegmento({
  id,
  nombres,
  className,
}: {
  id: SegmentoId;
  nombres: Preset["segmentos"];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <MarcaSegmento id={id} />
      {nombres[id]}
    </span>
  );
}

/** Reparto de la base por segmento: una barra apilada y su leyenda con cifras. */
export function BarraSegmentos({
  segmentos,
  nombres,
  formato,
}: {
  segmentos: ResumenSegmento[];
  nombres: Preset["segmentos"];
  formato: Formato;
}) {
  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[4px]" aria-hidden>
        {segmentos.map((s) => (
          <div
            key={s.id}
            style={{ flexGrow: s.clientes, backgroundColor: SEGMENTO_VISUAL[s.id].color }}
            className="min-w-1 basis-0"
          />
        ))}
      </div>
      <table className="mt-4 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Segmento</th>
            <th>Cantidad</th>
            <th>Parte de la base</th>
            <th>Parte de las ventas</th>
          </tr>
        </thead>
        <tbody>
          {segmentos.map((s) => (
            <tr key={s.id} className="border-t border-hairline first:border-t-0">
              <td className="py-2">
                <EtiquetaSegmento id={s.id} nombres={nombres} />
              </td>
              <td className="tabular py-2 text-right font-semibold">{formato.numero(s.clientes)}</td>
              <td className="tabular py-2 pl-3 text-right text-ink-2">
                {formato.porcentaje(s.parteClientes)}
              </td>
              <td className="tabular hidden py-2 pl-3 text-right text-ink-2 2xl:table-cell">
                {formato.porcentaje(s.parteVentas)} de las ventas
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
