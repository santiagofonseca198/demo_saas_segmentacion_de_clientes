"use client";

import { BarList } from "@/components/charts/bar-list";
import { Cambio } from "@/components/charts/cambio";
import { TrendChart } from "@/components/charts/trend-chart";
import { fechaDeDia } from "@/lib/data/fechas";
import type { Bloque, Reporte } from "@/lib/data/reportes";
import type { Formato } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Preset } from "@/tenants/schema";

function BloqueReporte({ bloque, preset, formato }: { bloque: Bloque; preset: Preset; formato: Formato }) {
  switch (bloque.tipo) {
    case "subtitulo":
      return <h3 className="mt-4 text-lg font-semibold">{bloque.texto}</h3>;
    case "parrafo":
      return <p className="max-w-[72ch]">{bloque.texto}</p>;
    case "lista":
      return (
        <ul className="grid max-w-[72ch] list-disc gap-1.5 pl-5">
          {bloque.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "kpis":
      return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-hairline py-4 lg:grid-cols-4">
          {bloque.items.map((item) => (
            <div key={item.etiqueta}>
              <dt className="text-sm text-ink-2">{item.etiqueta}</dt>
              <dd className="cifra mt-1 text-2xl">{item.valor}</dd>
              <dd className="mt-1">
                <Cambio valor={item.cambio} formato={formato} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "serie":
      return (
        <figure>
          <figcaption className="mb-2 font-semibold">{bloque.titulo}</figcaption>
          <TrendChart
            formato={formato}
            alto={220}
            nombreActual="Últimos 30 días"
            nombreAnterior="30 días anteriores"
            puntos={bloque.puntos.map((punto) => ({
              etiqueta: formato.fecha(fechaDeDia(punto.dia, preset.datos.fechaReferencia), "dia"),
              actual: punto.actual,
              anterior: punto.anterior,
            }))}
          />
        </figure>
      );
    case "barras":
      return (
        <figure className="max-w-xl">
          <figcaption className="mb-3 font-semibold">{bloque.titulo}</figcaption>
          <BarList
            filas={bloque.items.map((item) => ({
              nombre: item.nombre,
              valor: item.valor,
              etiqueta: formato.moneda(item.valor),
            }))}
          />
        </figure>
      );
    case "tabla":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-2">
                {bloque.columnas.map((columna, i) => (
                  <th
                    key={columna}
                    className={cn(
                      "pb-2 font-normal",
                      bloque.numericas.includes(i) ? "pl-4 text-right" : "pr-4 text-left",
                    )}
                  >
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloque.filas.map((fila) => (
                <tr key={fila.join("|")} className="border-t border-hairline">
                  {fila.map((celda, i) => (
                    <td
                      key={i}
                      className={cn(
                        "py-2",
                        bloque.numericas.includes(i) ? "tabular pl-4 text-right" : "pr-4",
                        i === 0 && "font-semibold",
                      )}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Convierte el reporte a texto plano para copiarlo a un correo o un chat. */
export function reporteATexto(reporte: Reporte, empresa: string): string {
  const lineas: string[] = [reporte.titulo, `${empresa}, ${reporte.periodo}`, ""];
  for (const bloque of reporte.bloques) {
    switch (bloque.tipo) {
      case "subtitulo":
        lineas.push("", bloque.texto.toUpperCase());
        break;
      case "parrafo":
        lineas.push(bloque.texto);
        break;
      case "lista":
        lineas.push(...bloque.items.map((item) => `- ${item}`));
        break;
      case "kpis":
        lineas.push(...bloque.items.map((item) => `${item.etiqueta}: ${item.valor}`));
        break;
      case "tabla":
        lineas.push(bloque.columnas.join(" | "), ...bloque.filas.map((fila) => fila.join(" | ")));
        break;
      case "barras":
        lineas.push(bloque.titulo, ...bloque.items.map((item) => `- ${item.nombre}`));
        break;
      case "serie":
        break;
    }
  }
  return lineas.join("\n");
}

export function Documento({
  reporte,
  preset,
  formato,
  pregunta,
}: {
  reporte: Reporte;
  preset: Preset;
  formato: Formato;
  pregunta: string | null;
}) {
  return (
    <article className="grid gap-4">
      <header className="border-b border-hairline pb-4">
        {pregunta && <p className="mb-2 text-sm text-ink-2">Tu pregunta: «{pregunta}»</p>}
        <h2 className="titulo-pagina">{reporte.titulo}</h2>
        <p className="mt-1 text-ink-2">
          {preset.empresa.nombre}, {reporte.periodo}
        </p>
      </header>
      {reporte.bloques.map((bloque, i) => (
        <BloqueReporte key={i} bloque={bloque} preset={preset} formato={formato} />
      ))}
    </article>
  );
}
