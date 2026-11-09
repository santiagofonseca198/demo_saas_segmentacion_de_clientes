"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { MedidorProbabilidad } from "@/components/charts/banda";
import { SegmentScatter } from "@/components/charts/segment-scatter";
import { EtiquetaSegmento, MarcaSegmento } from "@/components/charts/segmentos";
import { DataCard } from "@/components/glass/data-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsulta } from "@/hooks/use-consulta";
import { repositorio } from "@/lib/data/repository";
import { accionSegmento, descripcionSegmento, haceDias } from "@/lib/data/textos";
import type { SegmentoId } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { los, mayuscula, todos } from "@/tenants/rubros";

const FILAS_VISIBLES = 10;

export function Segmentos() {
  const preset = usePreset();
  const formato = useFormato();
  const [elegido, setElegido] = useState<SegmentoId | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(FILAS_VISIBLES);
  const { datos } = useConsulta(`segmentos:${claveDeDatos(preset)}`, () =>
    repositorio.segmentos(preset),
  );

  if (!datos) return null;
  const { cliente, pedido, zona } = preset.vocabulario;
  const texto = busqueda.trim().toLowerCase();
  const filtrados = datos.clientes
    .filter((c) => (elegido === null || c.segmento === elegido) && c.nombre.toLowerCase().includes(texto))
    .sort((a, b) => b.valor - a.valor);

  const elegir = (id: SegmentoId | null) => {
    setElegido(id);
    setVisibles(FILAS_VISIBLES);
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {datos.segmentos.map((segmento) => {
          const activo = elegido === segmento.id;
          return (
            <button
              key={segmento.id}
              type="button"
              aria-pressed={activo}
              onClick={() => elegir(activo ? null : segmento.id)}
              className={cn(
                "superficie-datos flex flex-col rounded-2xl p-5 text-left transition-shadow active:scale-[0.99]",
                activo && "ring-2 ring-brand-500",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <MarcaSegmento id={segmento.id} className="size-3.5" />
                {preset.segmentos[segmento.id]}
              </span>
              <span className="cifra mt-3 text-[2.125rem]">{formato.numero(segmento.clientes)}</span>
              <span className="mt-1 text-sm text-ink-2">
                {formato.porcentaje(segmento.parteClientes)} de {los(cliente)},{" "}
                {formato.porcentaje(segmento.parteVentas)} de las ventas
              </span>
              <span className="mt-3 text-sm">{descripcionSegmento(segmento.id)}</span>
              <span className="mt-3 border-t border-hairline pt-3 text-sm">
                <span className="font-semibold">Qué hacer: </span>
                {accionSegmento(segmento.id)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <DataCard
          titulo={`Mapa de ${cliente.plural}`}
          descripcion={`Cada punto es ${cliente.genero === "f" ? "una" : "un"} ${cliente.singular}: cuándo compró por última vez y cuánto gastó en el año`}
          className="xl:col-span-8"
        >
          <SegmentScatter
            clientes={datos.clientes}
            nombres={preset.segmentos}
            formato={formato}
            resaltado={elegido}
          />
        </DataCard>

        <DataCard
          titulo="Cómo se comparan"
          descripcion="Promedios de los últimos 12 meses"
          className="xl:col-span-4"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-2">
                <th className="pb-2 text-left font-normal">Segmento</th>
                <th className="pb-2 pl-2 text-right font-normal">Días sin comprar</th>
                <th className="pb-2 pl-2 text-right font-normal">{mayuscula(pedido.plural)} al año</th>
                <th className="pb-2 pl-2 text-right font-normal">Valor por {pedido.singular}</th>
              </tr>
            </thead>
            <tbody>
              {datos.segmentos.map((s) => (
                <tr key={s.id} className="border-t border-hairline">
                  <td className="py-2.5">
                    <EtiquetaSegmento id={s.id} nombres={preset.segmentos} />
                  </td>
                  <td className="tabular py-2.5 text-right">{formato.numero(s.recenciaMediana)}</td>
                  <td className="tabular py-2.5 text-right">{formato.numero(s.frecuenciaMedia, 1)}</td>
                  <td className="tabular py-2.5 text-right">{formato.moneda(s.ticketPromedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="mt-auto border-t border-hairline pt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Cómo se calculó</summary>
            <div className="mt-2 grid gap-2 text-ink-2">
              <p>
                Un algoritmo de agrupamiento (K-means, con cuatro grupos) reúne a {los(cliente)} que se
                parecen en tres cosas: hace cuánto compraron, cuántas veces compraron en el año y cuánto
                gastaron.
              </p>
              <p>
                El algoritmo solo forma los grupos. Los nombres y las acciones sugeridas se definen con
                el negocio.
              </p>
              <p>En esta demostración los datos y los grupos son simulados.</p>
            </div>
          </details>
        </DataCard>
      </div>

      <DataCard
        titulo={elegido ? preset.segmentos[elegido] : todos(cliente)}
        descripcion={`${formato.numero(filtrados.length)} ${
          filtrados.length === 1 ? cliente.singular : cliente.plural
        }, de mayor a menor gasto en el año`}
        accion={
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
                setVisibles(FILAS_VISIBLES);
              }}
              className="h-9 w-56 bg-white/70 pl-8"
            />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant={elegido === null ? "default" : "outline"} onClick={() => elegir(null)}>
            {todos(cliente)}
          </Button>
          {datos.segmentos.map((s) => (
            <Button
              key={s.id}
              variant={elegido === s.id ? "default" : "outline"}
              onClick={() => elegir(s.id)}
            >
              {preset.segmentos[s.id]}
            </Button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <p className="text-sm text-ink-2">
            Ningún resultado para «{busqueda.trim()}». Revisa el nombre o cambia de segmento.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-ink-2">
                    <th className="pb-2 font-normal">{mayuscula(cliente.singular)}</th>
                    <th className="pb-2 font-normal">Segmento</th>
                    <th className="pb-2 font-normal">{mayuscula(zona.singular)}</th>
                    <th className="pb-2 text-right font-normal">Última compra</th>
                    <th className="pb-2 text-right font-normal">{mayuscula(pedido.plural)} en el año</th>
                    <th className="pb-2 text-right font-normal">Gasto en el año</th>
                    <th className="pb-2 pl-6 font-normal">Probabilidad de compra</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0, visibles).map((c) => (
                    <tr key={c.id} className="border-t border-hairline">
                      <td className="py-2.5 font-semibold">{c.nombre}</td>
                      <td className="py-2.5">
                        <EtiquetaSegmento id={c.segmento} nombres={preset.segmentos} />
                      </td>
                      <td className="py-2.5">{c.zona}</td>
                      <td className="tabular whitespace-nowrap py-2.5 text-right">
                        {haceDias(c.recenciaDias, formato)}
                      </td>
                      <td className="tabular py-2.5 text-right">{formato.numero(c.frecuencia)}</td>
                      <td className="tabular py-2.5 text-right font-semibold">
                        {formato.moneda(c.valor)}
                      </td>
                      <td className="py-2.5 pl-6">
                        <MedidorProbabilidad puntaje={c.propension.puntaje} formato={formato} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibles < filtrados.length && (
              <div className="mt-3">
                <Button variant="ghost" onClick={() => setVisibles((v) => v + 20)}>
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
