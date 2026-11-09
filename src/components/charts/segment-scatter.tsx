"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SEGMENTO_VISUAL, trazoDeForma } from "@/lib/data/segmentos-visual";
import { haceDias } from "@/lib/data/textos";
import { SEGMENTOS, type Cliente, type SegmentoId } from "@/lib/data/types";
import type { Formato } from "@/lib/format";
import type { Preset } from "@/tenants/schema";
import { CajaTooltip, FilaTooltip } from "./chart-tooltip";
import { EtiquetaSegmento } from "./segmentos";

interface Punto {
  x: number;
  y: number;
  cliente: Cliente;
}

interface Centro {
  x: number;
  y: number;
  nombre: string;
}

function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)] ?? 0;
}

/**
 * Mapa de clientes: recencia contra gasto anual. Cada segmento lleva color,
 * forma y un rótulo en el centro del grupo, para no depender solo del color.
 */
export function SegmentScatter({
  clientes,
  nombres,
  formato,
  resaltado,
  alto = 380,
}: {
  clientes: Cliente[];
  nombres: Preset["segmentos"];
  formato: Formato;
  /** Si se indica, los demás segmentos se atenúan. */
  resaltado: SegmentoId | null;
  alto?: number;
}) {
  const porSegmento = SEGMENTOS.map((id) => {
    const puntos: Punto[] = clientes
      .filter((c) => c.segmento === id)
      .map((cliente) => ({ x: cliente.recenciaDias, y: cliente.valor, cliente }));
    return { id, puntos };
  });
  const centros: Centro[] = porSegmento
    .filter((s) => s.puntos.length > 0)
    .map((s) => ({
      x: mediana(s.puntos.map((p) => p.x)),
      y: mediana(s.puntos.map((p) => p.y)),
      nombre: nombres[s.id],
    }));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        {SEGMENTOS.map((id) => (
          <li key={id}>
            <EtiquetaSegmento id={id} nombres={nombres} />
          </li>
        ))}
      </ul>
      <div style={{ height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 0 }}>
            <CartesianGrid />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, "dataMax"]}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickMargin={8}
              tickCount={8}
              label={{
                value: "Días desde la última compra",
                position: "insideBottom",
                offset: -16,
                fill: "var(--ink-2)",
                fontSize: 13,
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              scale="sqrt"
              domain={[0, "dataMax"]}
              width={64}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickFormatter={(valor: number) => formato.monedaCorta(valor)}
            />
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const punto = payload?.[0]?.payload as Punto | Centro | undefined;
                if (!active || !punto || !("cliente" in punto)) return null;
                const { cliente } = punto;
                return (
                  <CajaTooltip titulo={cliente.nombre}>
                    <p className="mb-1 text-ink-2">
                      <EtiquetaSegmento id={cliente.segmento} nombres={nombres} />
                    </p>
                    <FilaTooltip
                      etiqueta="Última compra"
                      valor={haceDias(cliente.recenciaDias, formato)}
                    />
                    <FilaTooltip etiqueta="Gasto en el año" valor={formato.moneda(cliente.valor)} />
                  </CajaTooltip>
                );
              }}
            />
            {porSegmento.map(({ id, puntos }) => {
              const { color, forma } = SEGMENTO_VISUAL[id];
              const atenuado = resaltado !== null && resaltado !== id;
              return (
                <Scatter
                  key={id}
                  data={puntos}
                  isAnimationActive={false}
                  shape={(props: { cx?: number; cy?: number }) => (
                    <path
                      d={trazoDeForma(forma, 4.6)}
                      transform={`translate(${props.cx ?? 0} ${props.cy ?? 0})`}
                      fill={color}
                      fillOpacity={atenuado ? 0.12 : 0.72}
                      stroke="var(--superficie-datos)"
                      strokeWidth={1}
                    />
                  )}
                />
              );
            })}
            <Scatter
              data={centros}
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number; payload?: Centro }) => (
                <text
                  x={props.cx}
                  y={props.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={600}
                  fill="var(--ink)"
                  stroke="var(--superficie-datos)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {props.payload?.nombre}
                </text>
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
