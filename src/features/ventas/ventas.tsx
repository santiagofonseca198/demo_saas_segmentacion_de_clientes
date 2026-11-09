"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { BarList } from "@/components/charts/bar-list";
import { Columnas } from "@/components/charts/columnas";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { DataCard } from "@/components/glass/data-card";
import { Button } from "@/components/ui/button";
import { COMPARACION, ESTILO_FECHA } from "@/features/resumen/resumen";
import { useConsulta } from "@/hooks/use-consulta";
import { descargarCsv } from "@/lib/csv";
import { fechaDeDia } from "@/lib/data/fechas";
import { formatearKpi } from "@/lib/data/reportes";
import { repositorio } from "@/lib/data/repository";
import type { Barra } from "@/lib/data/types";
import type { Formato } from "@/lib/format";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { useFiltros } from "@/state/filtros";
import { etiquetaKpi, mayuscula } from "@/tenants/rubros";

const FILAS_VISIBLES = 12;

function filasConCambio(barras: Barra[], formato: Formato) {
  return barras.map((barra) => {
    const diferencia = barra.valor - (barra.anterior ?? 0);
    return {
      nombre: barra.nombre,
      valor: barra.valor,
      etiqueta: formato.moneda(barra.valor),
      detalle: `${diferencia >= 0 ? "+" : "−"}${formato.moneda(Math.abs(diferencia))} frente al periodo anterior`,
    };
  });
}

export function Ventas() {
  const preset = usePreset();
  const formato = useFormato();
  const periodo = useFiltros((estado) => estado.periodo);
  const zona = useFiltros((estado) => estado.zona);
  const [visibles, setVisibles] = useState(FILAS_VISIBLES);
  const { datos } = useConsulta(`ventas:${claveDeDatos(preset)}:${periodo}:${zona}`, () =>
    repositorio.ventas(preset, { periodo, zona }),
  );

  if (!datos) return null;
  const { cliente, pedido, zona: terminoZona } = preset.vocabulario;
  const fecha = (dia: number) => fechaDeDia(dia, preset.datos.fechaReferencia);

  const exportar = () =>
    descargarCsv(
      `${preset.id}-${pedido.plural}`,
      ["Número", "Fecha", mayuscula(cliente.singular), mayuscula(terminoZona.singular), "Canal", "Unidades", "Total"],
      datos.pedidos.map((p) => [
        p.id,
        fecha(p.dia).toISOString().slice(0, 10),
        p.cliente,
        p.zona,
        p.canal,
        p.unidades,
        formato.plano(p.total),
      ]),
    );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <DataCard titulo="Ventas en el tiempo" descripcion={COMPARACION[periodo]}>
        <TrendChart
          formato={formato}
          alto={260}
          puntos={datos.serie.map((punto) => ({
            etiqueta: formato.fecha(fecha(punto.dia), ESTILO_FECHA[periodo]),
            actual: punto.actual,
            anterior: punto.anterior,
          }))}
        />
      </DataCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard titulo="Por categoría" descripcion="Ventas del periodo">
          <BarList filas={filasConCambio(datos.porCategoria, formato)} />
        </DataCard>
        <DataCard titulo="Por día de la semana" descripcion="Ventas del periodo">
          <Columnas
            columnas={datos.porDiaSemana.map((dia) => ({
              etiqueta: dia.nombre.slice(0, 3),
              nombre: dia.nombre,
              valor: dia.valor,
            }))}
            nombreValor="Ventas"
            formatoValor={(valor) => formato.moneda(valor)}
            formatoEje={(valor) => formato.monedaCorta(valor)}
            alto={250}
          />
        </DataCard>
        <DataCard titulo="Por canal" descripcion="Ventas del periodo">
          <BarList filas={filasConCambio(datos.porCanal, formato)} />
        </DataCard>
        <DataCard titulo={`Por ${terminoZona.singular}`} descripcion="Ventas del periodo">
          <BarList filas={filasConCambio(datos.porZona, formato)} />
        </DataCard>
      </div>

      <DataCard
        titulo={`${mayuscula(pedido.plural)} del periodo`}
        descripcion={`${formato.numero(datos.pedidos.length)} en total, del más reciente al más antiguo`}
        accion={
          <Button variant="outline" onClick={exportar} disabled={datos.pedidos.length === 0}>
            <Download aria-hidden />
            Exportar a CSV
          </Button>
        }
      >
        {datos.pedidos.length === 0 ? (
          <p className="text-sm text-ink-2">No hay {pedido.plural} en este periodo. Prueba con un periodo más largo.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-ink-2">
                    <th className="pb-2 font-normal">Fecha</th>
                    <th className="pb-2 font-normal">{mayuscula(cliente.singular)}</th>
                    <th className="pb-2 font-normal">{mayuscula(terminoZona.singular)}</th>
                    <th className="pb-2 font-normal">Canal</th>
                    <th className="pb-2 text-right font-normal">Unidades</th>
                    <th className="pb-2 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.pedidos.slice(0, visibles).map((p) => (
                    <tr key={p.id} className="border-t border-hairline">
                      <td className="tabular whitespace-nowrap py-2.5 text-ink-2">
                        {formato.fecha(fecha(p.dia), "dia")}
                      </td>
                      <td className="py-2.5 font-semibold">{p.cliente}</td>
                      <td className="py-2.5">{p.zona}</td>
                      <td className="py-2.5">{p.canal}</td>
                      <td className="tabular py-2.5 text-right">{formato.numero(p.unidades)}</td>
                      <td className="tabular py-2.5 text-right font-semibold">
                        {formato.monedaExacta(p.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibles < datos.pedidos.length && (
              <div className="mt-3">
                <Button variant="ghost" onClick={() => setVisibles((v) => v + 24)}>
                  Mostrar más
                </Button>
              </div>
            )}
          </>
        )}
      </DataCard>
    </div>
  );
}
