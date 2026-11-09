"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Formato } from "@/lib/format";
import { CajaTooltip, FilaTooltip } from "./chart-tooltip";

export interface PuntoTendencia {
  etiqueta: string;
  actual: number;
  anterior?: number;
}

const MUESTRA_ACTUAL = <span className="h-0.5 w-3.5 rounded-full bg-brand-500" aria-hidden />;
const MUESTRA_ANTERIOR = (
  <span
    className="h-0.5 w-3.5 bg-[repeating-linear-gradient(90deg,var(--neutro)_0_4px,transparent_4px_7px)]"
    aria-hidden
  />
);

/** Tendencia en el tiempo: el periodo actual en color de marca y el anterior en gris. */
export function TrendChart({
  puntos,
  formato,
  alto = 280,
  nombreActual = "Este periodo",
  nombreAnterior = "Periodo anterior",
}: {
  puntos: PuntoTendencia[];
  formato: Formato;
  alto?: number;
  nombreActual?: string;
  nombreAnterior?: string;
}) {
  const id = useId();
  const conAnterior = puntos.some((p) => p.anterior !== undefined);

  return (
    <div>
      {conAnterior && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
          <li className="flex items-center gap-2">
            {MUESTRA_ACTUAL}
            {nombreActual}
          </li>
          <li className="flex items-center gap-2">
            {MUESTRA_ANTERIOR}
            {nombreAnterior}
          </li>
        </ul>
      )}
      <div style={{ height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickMargin={8}
              minTickGap={28}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickCount={5}
              tickFormatter={(valor: number) => formato.monedaCorta(valor)}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-2)", strokeWidth: 1, strokeDasharray: "3 3" }}
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                const punto = payload?.[0]?.payload as PuntoTendencia | undefined;
                if (!active || !punto) return null;
                return (
                  <CajaTooltip titulo={String(label)}>
                    <FilaTooltip
                      muestra={MUESTRA_ACTUAL}
                      etiqueta={nombreActual}
                      valor={formato.moneda(punto.actual)}
                    />
                    {punto.anterior !== undefined && (
                      <FilaTooltip
                        muestra={MUESTRA_ANTERIOR}
                        etiqueta={nombreAnterior}
                        valor={formato.moneda(punto.anterior)}
                      />
                    )}
                  </CajaTooltip>
                );
              }}
            />
            {conAnterior && (
              <Line
                dataKey="anterior"
                type="linear"
                stroke="var(--neutro)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeLinejoin="round"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              dataKey="actual"
              type="linear"
              stroke="var(--brand-500)"
              strokeWidth={2}
              strokeLinejoin="round"
              fill={`url(#${id})`}
              dot={false}
              activeDot={{ r: 4.5, fill: "var(--brand-500)", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
