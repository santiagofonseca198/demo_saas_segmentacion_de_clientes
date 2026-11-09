"use client";

import { Download, Search } from "lucide-react";
import { useState } from "react";
import { EtiquetaBanda, MedidorProbabilidad } from "@/components/charts/banda";
import { Columnas } from "@/components/charts/columnas";
import { EtiquetaSegmento } from "@/components/charts/segmentos";
import { StatTile } from "@/components/charts/stat-tile";
import { DataCard } from "@/components/glass/data-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConsulta } from "@/hooks/use-consulta";
import { descargarCsv } from "@/lib/csv";
import { CORTE_ALTA, CORTE_MEDIA } from "@/lib/data/propension";
import { repositorio } from "@/lib/data/repository";
import { NOMBRE_BANDA, accionSugerida, textoFactor } from "@/lib/data/textos";
import { SEGMENTOS, type Banda, type SegmentoId } from "@/lib/data/types";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { los, mayuscula } from "@/tenants/rubros";
import { DetalleCliente } from "./detalle-cliente";

const FILAS_VISIBLES = 12;
const TODAS = "todas";
const BANDAS: Banda[] = ["alta", "media", "baja"];

export function Oportunidades() {
  const preset = usePreset();
  const formato = useFormato();
  const [banda, setBanda] = useState<Banda | null>(null);
  const [segmento, setSegmento] = useState<SegmentoId | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(FILAS_VISIBLES);
  const [abierto, setAbierto] = useState<string | null>(null);
  const { datos } = useConsulta(`oportunidades:${claveDeDatos(preset)}`, () =>
    repositorio.oportunidades(preset),
  );

  if (!datos) return null;
  const { cliente } = preset.vocabulario;
  const texto = busqueda.trim().toLowerCase();
  const filtrados = datos.clientes.filter(
    (c) =>
      (banda === null || c.propension.banda === banda) &&
      (segmento === null || c.segmento === segmento) &&
      c.nombre.toLowerCase().includes(texto),
  );
  const altas = datos.clientes.filter((c) => c.propension.banda === "alta").length;
  const reiniciar = () => setVisibles(FILAS_VISIBLES);

  const opcionesSegmento = [
    { value: TODAS, label: "Todos los segmentos" },
    ...SEGMENTOS.map((id) => ({ value: id as string, label: preset.segmentos[id] })),
  ];

  const exportar = () =>
    descargarCsv(
      `${preset.id}-oportunidades`,
      [mayuscula(cliente.singular), "Segmento", "Probabilidad (%)", "Nivel", "Valor esperado", "Por qué", "Qué hacer"],
      filtrados.map((c) => [
        c.nombre,
        preset.segmentos[c.segmento],
        c.propension.puntaje,
        NOMBRE_BANDA[c.propension.banda],
        formato.plano(c.propension.valorEsperado),
        textoFactor(c.propension.factores[0], c, preset.vocabulario, formato),
        accionSugerida(c),
      ]),
    );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          etiqueta={`${mayuscula(cliente.plural)} con probabilidad alta`}
          valor={formato.numero(altas)}
          formato={formato}
          nota={`De ${formato.numero(datos.clientes.length)} en total. Probabilidad de ${formato.porcentaje(CORTE_ALTA / 100)} o más.`}
        />
        <StatTile
          etiqueta="Valor esperado en 30 días"
          valor={formato.moneda(datos.valorEsperadoAlta, { compacta: true })}
          formato={formato}
          nota="Si se cumplen las probabilidades del grupo de probabilidad alta."
        />
        <StatTile
          etiqueta="Qué tan seguido acierta"
          valor={`${formato.numero(datos.aciertoBandaAlta * 10)} de cada 10`}
          formato={formato}
          nota="Compras esperadas entre quienes tienen probabilidad alta. Estimación del modelo."
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <DataCard
          titulo="Cómo se reparte la probabilidad"
          descripcion={`Cantidad de ${cliente.plural} en cada tramo`}
          className="xl:col-span-4"
        >
          <Columnas
            columnas={datos.distribucion.map((cantidad, i) => ({
              etiqueta: String(i * 10),
              nombre: `Entre ${i * 10} % y ${i * 10 + 10} %`,
              valor: cantidad,
            }))}
            nombreValor={mayuscula(cliente.plural)}
            formatoValor={(valor) => formato.numero(valor)}
            cortes={[
              { despuesDe: CORTE_MEDIA / 10 - 1, rotulo: "Media" },
              { despuesDe: CORTE_ALTA / 10 - 1, rotulo: "Alta" },
            ]}
            alto={240}
          />
          <p className="mt-2 text-center text-sm text-ink-2">Probabilidad de compra (%)</p>

          <details className="mt-4 border-t border-hairline pt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Cómo se calculó</summary>
            <div className="mt-2 grid gap-2 text-ink-2">
              <p>
                Un modelo de clasificación estima la probabilidad de que cada {cliente.singular} compre
                en los próximos 30 días. Usa cinco señales: hace cuánto compró, cuántas veces compró en
                el año, cuánto gastó, si responde a promociones y si viene comprando más o menos que
                antes.
              </p>
              <p>
                El valor esperado es esa probabilidad multiplicada por el valor promedio de sus compras.
              </p>
              <p>En esta demostración los datos y el modelo son simulados.</p>
            </div>
          </details>
        </DataCard>

        <DataCard
          titulo="A quién contactar"
          descripcion={`${formato.numero(filtrados.length)} ${
            filtrados.length === 1 ? cliente.singular : cliente.plural
          }, de mayor a menor valor esperado`}
          accion={
            <Button variant="outline" onClick={exportar} disabled={filtrados.length === 0}>
              <Download aria-hidden />
              Exportar a CSV
            </Button>
          }
          className="xl:col-span-8"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant={banda === null ? "default" : "outline"}
              onClick={() => {
                setBanda(null);
                reiniciar();
              }}
            >
              Todas
            </Button>
            {BANDAS.map((b) => (
              <Button
                key={b}
                variant={banda === b ? "default" : "outline"}
                onClick={() => {
                  setBanda(b);
                  reiniciar();
                }}
              >
                {NOMBRE_BANDA[b]}
              </Button>
            ))}
            <Select
              items={opcionesSegmento}
              value={segmento ?? TODAS}
              onValueChange={(valor) => {
                setSegmento(valor === TODAS ? null : (valor as SegmentoId));
                reiniciar();
              }}
            >
              <SelectTrigger aria-label="Segmento" className="ml-auto h-8 bg-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                {opcionesSegmento.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-2"
                aria-hidden
              />
              <Input
                type="search"
                aria-label={`Buscar ${cliente.singular} por nombre`}
                placeholder="Buscar por nombre"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  reiniciar();
                }}
                className="h-8 w-48 bg-white/70 pl-8"
              />
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="text-sm text-ink-2">
              Ningún resultado con estos filtros. Quita alguno para ver a {los(cliente)}.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-ink-2">
                      <th className="pb-2 font-normal">{mayuscula(cliente.singular)}</th>
                      <th className="pb-2 font-normal">Probabilidad</th>
                      <th className="pb-2 text-right font-normal">Valor esperado</th>
                      <th className="pb-2 pl-6 font-normal">Por qué</th>
                      <th className="pb-2 pl-4 font-normal">Qué hacer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.slice(0, visibles).map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-hairline transition-colors hover:bg-brand-50/70"
                      >
                        <td className="py-2.5 pr-3">
                          <button
                            type="button"
                            onClick={() => setAbierto(c.id)}
                            className="whitespace-nowrap text-left font-semibold underline decoration-brand-200 decoration-2 underline-offset-4 hover:decoration-brand-500"
                          >
                            {c.nombre}
                          </button>
                          <EtiquetaSegmento
                            id={c.segmento}
                            nombres={preset.segmentos}
                            className="mt-0.5 flex text-ink-2"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <MedidorProbabilidad puntaje={c.propension.puntaje} formato={formato} />
                          <EtiquetaBanda banda={c.propension.banda} className="mt-0.5 text-ink-2" />
                        </td>
                        <td className="tabular py-2.5 text-right font-semibold">
                          {formato.moneda(c.propension.valorEsperado)}
                        </td>
                        <td className="py-2.5 pl-6">
                          {c.propension.factores.slice(0, 2).map((factor) => (
                            <span key={factor.id} className="block">
                              {textoFactor(factor, c, preset.vocabulario, formato)}
                            </span>
                          ))}
                        </td>
                        <td className="py-2.5 pl-4">{accionSugerida(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibles < filtrados.length && (
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

      <DetalleCliente clienteId={abierto} alCerrar={() => setAbierto(null)} />
    </div>
  );
}
