"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CajaTooltip, FilaTooltip } from "./chart-tooltip";

export interface Columna {
  etiqueta: string;
  /** Nombre completo para el tooltip; si falta se usa la etiqueta. */
  nombre?: string;
  valor: number;
}

/** Columnas de una sola serie, con marcas opcionales sobre el eje horizontal. */
export function Columnas({
  columnas,
  formatoValor,
  formatoEje,
  nombreValor,
  alto = 220,
  cortes = [],
}: {
  columnas: Columna[];
  formatoValor(valor: number): string;
  formatoEje?(valor: number): string;
  nombreValor: string;
  alto?: number;
  /** Líneas verticales entre columnas, con su rótulo. `despuesDe` es el índice de la columna previa. */
  cortes?: { despuesDe: number; rotulo: string }[];
}) {
  // Con cortes se usa un eje numérico para poder trazar la línea entre dos columnas.
  const datos = columnas.map((columna, i) => ({ ...columna, posicion: i }));
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="posicion"
            type="number"
            domain={[-0.5, columnas.length - 0.5]}
            ticks={datos.map((d) => d.posicion)}
            tickFormatter={(posicion: number) => columnas[posicion]?.etiqueta ?? ""}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            tickMargin={8}
            interval={0}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tickCount={4}
            allowDecimals={false}
            tickFormatter={formatoEje ?? formatoValor}
          />
          <Tooltip
            cursor={{ fill: "var(--hairline)" }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const columna = payload?.[0]?.payload as Columna | undefined;
              if (!active || !columna) return null;
              return (
                <CajaTooltip titulo={columna.nombre ?? columna.etiqueta}>
                  <FilaTooltip etiqueta={nombreValor} valor={formatoValor(columna.valor)} />
                </CajaTooltip>
              );
            }}
          />
          {cortes.map((corte) => (
            <ReferenceLine
              key={corte.rotulo}
              x={corte.despuesDe + 0.5}
              stroke="var(--ink-2)"
              strokeDasharray="3 3"
              label={{
                value: corte.rotulo,
                position: "insideTopLeft",
                fill: "var(--ink-2)",
                fontSize: 12,
                dy: -18,
                dx: 2,
              }}
            />
          ))}
          <Bar
            dataKey="valor"
            fill="var(--brand-500)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
