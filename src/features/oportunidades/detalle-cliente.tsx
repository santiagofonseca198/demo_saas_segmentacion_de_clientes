"use client";

import { EtiquetaBanda } from "@/components/charts/banda";
import { EtiquetaSegmento } from "@/components/charts/segmentos";
import { TrendChart } from "@/components/charts/trend-chart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useConsulta } from "@/hooks/use-consulta";
import { fechaDeDia } from "@/lib/data/fechas";
import { repositorio, type DatosCliente } from "@/lib/data/repository";
import { accionSugerida, haceDias, textoFactor } from "@/lib/data/textos";
import { cn } from "@/lib/utils";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { mayuscula } from "@/tenants/rubros";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-2">{etiqueta}</dt>
      <dd className="tabular font-semibold">{valor}</dd>
    </div>
  );
}

function Detalle({ datos }: { datos: DatosCliente }) {
  const preset = usePreset();
  const formato = useFormato();
  const { cliente, historial } = datos;
  const { propension } = cliente;
  const { pedido, zona } = preset.vocabulario;
  const mayorAporte = Math.max(...propension.factores.map((f) => Math.abs(f.aporte))) || 1;

  return (
    <>
      <SheetHeader className="px-6 pb-0 pt-6">
        <SheetTitle className="text-xl font-semibold">{cliente.nombre}</SheetTitle>
        <SheetDescription className="flex flex-wrap gap-x-4 gap-y-1">
          <EtiquetaSegmento id={cliente.segmento} nombres={preset.segmentos} />
          <span>
            {mayuscula(zona.singular)}: {cliente.zona}
          </span>
          <span>Canal habitual: {cliente.canal}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-6 overflow-y-auto px-6 pb-6">
        <section className="flex items-end justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <h3 className="text-sm text-ink-2">Probabilidad de compra en {datos.ventanaDias} días</h3>
            <p className="cifra mt-1 text-[2.75rem]">{formato.porcentaje(propension.puntaje / 100)}</p>
          </div>
          <div className="pb-1 text-right">
            <EtiquetaBanda banda={propension.banda} className="font-semibold" />
            <p className="mt-1 text-sm text-ink-2">
              Valor esperado: {formato.moneda(propension.valorEsperado)}
            </p>
          </div>
        </section>

        <section>
          <h3 className="font-semibold">Por qué este puntaje</h3>
          <p className="mt-0.5 text-sm text-ink-2">
            A la derecha, lo que sube la probabilidad; a la izquierda, lo que la baja.
          </p>
          <ul className="mt-3 grid gap-3">
            {propension.factores.map((factor) => {
              const sube = factor.aporte >= 0;
              const neutro = Math.abs(factor.aporte) < 0.05;
              const ancho = `${(Math.abs(factor.aporte) / mayorAporte) * 50}%`;
              return (
                <li key={factor.id}>
                  <p className="flex justify-between gap-3 text-sm">
                    <span>{textoFactor(factor, cliente, preset.vocabulario, formato)}</span>
                    <span className="shrink-0 text-ink-2">
                      {neutro ? "Sin efecto" : sube ? "Sube" : "Baja"}
                    </span>
                  </p>
                  <div className="relative mt-1.5 h-2" aria-hidden>
                    <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ink/25" />
                    <span
                      style={{ width: ancho }}
                      className={cn(
                        "absolute inset-y-0",
                        sube
                          ? "left-1/2 ml-px rounded-r-[4px] bg-brand-500"
                          : "right-1/2 mr-px rounded-l-[4px] bg-serie-3",
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="font-semibold">Qué hacer</h3>
          <p className="mt-1">{accionSugerida(cliente)}.</p>
        </section>

        <section>
          <h3 className="font-semibold">Compras de los últimos 12 meses</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato etiqueta="Última compra" valor={haceDias(cliente.recenciaDias, formato)} />
            <Dato etiqueta={`${mayuscula(pedido.plural)} en el año`} valor={formato.numero(cliente.frecuencia)} />
            <Dato etiqueta="Gasto en el año" valor={formato.moneda(cliente.valor)} />
            <Dato etiqueta={`Valor por ${pedido.singular}`} valor={formato.monedaExacta(cliente.ticketPromedio)} />
          </dl>
          <div className="mt-4">
            <TrendChart
              formato={formato}
              alto={150}
              nombreActual="Gasto del mes"
              puntos={historial.map((punto) => ({
                etiqueta: formato.fecha(fechaDeDia(punto.dia, preset.datos.fechaReferencia), "mes"),
                actual: punto.actual,
              }))}
            />
          </div>
        </section>
      </div>
    </>
  );
}

/** Hoja lateral con el detalle de un cliente y la explicación de su puntaje. */
export function DetalleCliente({
  clienteId,
  alCerrar,
}: {
  clienteId: string | null;
  alCerrar(): void;
}) {
  const preset = usePreset();
  const { datos } = useConsulta(`cliente:${claveDeDatos(preset)}:${clienteId}`, async () =>
    clienteId ? repositorio.cliente(preset, clienteId) : null,
  );

  return (
    <Sheet open={clienteId !== null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <SheetContent
        side="right"
        className="w-full gap-5 data-[side=right]:sm:max-w-[460px] sm:inset-y-3 sm:right-3 sm:h-auto sm:rounded-3xl"
      >
        {datos ? (
          <Detalle datos={datos} />
        ) : (
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Cargando</SheetTitle>
            <SheetDescription>Un momento.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
