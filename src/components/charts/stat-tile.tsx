import type { Formato } from "@/lib/format";
import { Cambio } from "./cambio";

const ALTO = 32;
const MARGEN = 4;

/** Mini-tendencia a todo el ancho de la tarjeta, con el último punto marcado. */
function MiniTendencia({ serie }: { serie: number[] }) {
  if (serie.length < 2) return null;
  const max = Math.max(...serie);
  const min = Math.min(...serie);
  const rango = max - min || 1;
  const y = (valor: number) => ALTO - MARGEN - ((valor - min) / rango) * (ALTO - 2 * MARGEN);
  const puntos = serie.map((valor, i) => `${(i * 100) / (serie.length - 1)},${y(valor)}`);
  return (
    <div className="relative mr-1 mt-3 h-8" aria-hidden>
      <svg
        viewBox={`0 0 100 ${ALTO}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        <polyline
          points={puntos.join(" ")}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute -right-1 size-2 -translate-y-1/2 rounded-full bg-brand-500 ring-2 ring-white"
        style={{ top: `${(y(serie[serie.length - 1]) / ALTO) * 100}%` }}
      />
    </div>
  );
}

/** Indicador: valor grande, cambio frente al periodo anterior y mini-tendencia. */
export function StatTile({
  etiqueta,
  valor,
  cambio,
  serie,
  formato,
  nota,
}: {
  etiqueta: string;
  valor: string;
  /** Si se omite, no se muestra la comparación. */
  cambio?: number | null;
  serie?: number[];
  formato: Formato;
  /** Texto que reemplaza a la comparación con el periodo anterior. */
  nota?: string;
}) {
  return (
    <section className="superficie-datos flex min-w-0 flex-col rounded-2xl p-5">
      <h2 className="truncate text-sm text-ink-2">{etiqueta}</h2>
      <p className="cifra mt-2 whitespace-nowrap text-[2.125rem]">{valor}</p>
      {nota ? (
        <p className="mt-3 text-sm text-ink-2">{nota}</p>
      ) : (
        cambio !== undefined && (
          <p className="mt-2 flex min-w-0 items-center gap-x-1.5 whitespace-nowrap">
            <Cambio valor={cambio} formato={formato} />
            {cambio !== null && (
              <span className="truncate text-sm text-ink-2">frente al periodo anterior</span>
            )}
          </p>
        )
      )}
      {serie && <MiniTendencia serie={serie} />}
    </section>
  );
}
