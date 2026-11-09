"use client";

import { TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { MedidorProbabilidad } from "@/components/charts/banda";
import { BarList } from "@/components/charts/bar-list";
import { BarraSegmentos, EtiquetaSegmento } from "@/components/charts/segmentos";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { DataCard } from "@/components/glass/data-card";
import { useConsulta } from "@/hooks/use-consulta";
import { fechaDeDia } from "@/lib/data/fechas";
import { formatearKpi } from "@/lib/data/reportes";
import { repositorio } from "@/lib/data/repository";
import type { PeriodoId } from "@/lib/data/types";
import type { EstiloFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { useFiltros } from "@/state/filtros";
import { etiquetaKpi, los, mayuscula } from "@/tenants/rubros";

export const ESTILO_FECHA: Record<PeriodoId, EstiloFecha> = {
  "7d": "diaSemana",
  "30d": "dia",
  "90d": "dia",
  "12m": "mes",
};

export const COMPARACION: Record<PeriodoId, string> = {
  "7d": "Últimos 7 días frente a los 7 anteriores",
  "30d": "Últimos 30 días frente a los 30 anteriores",
  "90d": "Últimos 90 días frente a los 90 anteriores",
  "12m": "Últimos 12 meses frente a los 12 anteriores",
};

function EnlaceSeccion({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-brand-700 underline decoration-brand-200 decoration-2 underline-offset-4 transition-colors hover:decoration-brand-500"
    >
      {children}
    </Link>
  );
}

export function Resumen() {
  const preset = usePreset();
  const formato = useFormato();
  const periodo = useFiltros((estado) => estado.periodo);
  const zona = useFiltros((estado) => estado.zona);
  const { datos } = useConsulta(`resumen:${claveDeDatos(preset)}:${periodo}:${zona}`, () =>
    repositorio.resumen(preset, { periodo, zona }),
  );

  if (!datos) return null;
  const { cliente } = preset.vocabulario;

  return (
    <div className="entrada grid gap-4">
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          datos.kpis.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4",
        )}
      >
        {datos.kpis.map((kpi) => (
          <StatTile
            key={kpi.id}
            etiqueta={etiquetaKpi(kpi.id, preset)}
            valor={formatearKpi(kpi.id, kpi.valor, formato)}
            cambio={kpi.cambio}
            serie={kpi.serie}
            formato={formato}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <DataCard
          titulo="Ventas en el tiempo"
          descripcion={COMPARACION[periodo]}
          className="xl:col-span-8"
        >
          <TrendChart
            formato={formato}
            puntos={datos.serie.map((punto) => ({
              etiqueta: formato.fecha(
                fechaDeDia(punto.dia, preset.datos.fechaReferencia),
                ESTILO_FECHA[periodo],
              ),
              actual: punto.actual,
              anterior: punto.anterior,
            }))}
          />
        </DataCard>

        <DataCard
          titulo="Lo más importante"
          descripcion="Redactado por el agente a partir de estos datos"
          className="xl:col-span-4"
        >
          <ul className="grid gap-4">
            {datos.hallazgos.map((hallazgo) => {
              const Icono = hallazgo.tono === "positivo" ? TrendingUp : TriangleAlert;
              return (
                <li key={hallazgo.enlace} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                      hallazgo.tono === "positivo"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-[#fdf0cf] text-[#7a4f00]",
                    )}
                  >
                    <Icono className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p>{hallazgo.texto}</p>
                    <p className="mt-1">
                      <EnlaceSeccion href={hallazgo.enlace}>{hallazgo.enlaceTexto}</EnlaceSeccion>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-auto border-t border-hairline pt-4">
            <EnlaceSeccion href="/reportes">Pedir un reporte completo</EnlaceSeccion>
          </p>
        </DataCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DataCard titulo="Más vendidos" descripcion="Por ventas en el periodo">
          <BarList
            filas={datos.masVendidos.map((producto) => ({
              nombre: producto.nombre,
              valor: producto.valor,
              etiqueta: formato.moneda(producto.valor),
            }))}
          />
        </DataCard>

        <DataCard
          titulo={`${mayuscula(cliente.plural)} por segmento`}
          descripcion={`Según su comportamiento en los últimos 12 meses`}
          accion={<EnlaceSeccion href="/clientes">Ver segmentos</EnlaceSeccion>}
        >
          <BarraSegmentos segmentos={datos.segmentos} nombres={preset.segmentos} formato={formato} />
        </DataCard>

        <DataCard
          titulo="Oportunidades de la semana"
          descripcion={`${mayuscula(los(cliente))} con mayor valor esperado`}
          accion={<EnlaceSeccion href="/oportunidades">Ver todas</EnlaceSeccion>}
          className="lg:col-span-2 xl:col-span-1"
        >
          <ul className="grid">
            {datos.oportunidades.map((oportunidad) => (
              <li
                key={oportunidad.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-t border-hairline py-2.5 first:border-t-0 first:pt-0"
              >
                <span className="min-w-0 truncate font-semibold">{oportunidad.nombre}</span>
                <span className="tabular text-right font-semibold">
                  {formato.moneda(oportunidad.propension.valorEsperado)}
                </span>
                <EtiquetaSegmento
                  id={oportunidad.segmento}
                  nombres={preset.segmentos}
                  className="text-sm text-ink-2"
                />
                <MedidorProbabilidad
                  puntaje={oportunidad.propension.puntaje}
                  formato={formato}
                  className="w-32 justify-end text-sm"
                />
              </li>
            ))}
          </ul>
        </DataCard>
      </div>
    </div>
  );
}
