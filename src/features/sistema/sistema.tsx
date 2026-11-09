"use client";

import { EtiquetaBanda, MedidorProbabilidad } from "@/components/charts/banda";
import { Cambio } from "@/components/charts/cambio";
import { EtiquetaSegmento } from "@/components/charts/segmentos";
import { DataCard } from "@/components/glass/data-card";
import { Button } from "@/components/ui/button";
import { SEGMENTOS } from "@/lib/data/types";
import { useDemo, useFormato, usePreset } from "@/state/demo";

function Muestra({ nombre, variable, nota }: { nombre: string; variable: string; nota?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-xl border border-hairline"
        style={{ background: `var(${variable})` }}
      />
      <div className="min-w-0">
        <p className="font-semibold">{nombre}</p>
        <p className="truncate text-sm text-ink-2">{nota ?? variable}</p>
      </div>
    </div>
  );
}

/** Galería interna: materiales, color, tipografía y piezas, para revisar el aspecto. */
export function Sistema() {
  const preset = usePreset();
  const formato = useFormato();
  const abrirPanel = useDemo((estado) => estado.abrirPanel);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="vidrio-marco rounded-3xl p-5">
          <h2 className="font-semibold">Vidrio de marco</h2>
          <p className="mt-1 text-sm text-ink-2">
            Barra lateral y barra superior. Deja ver la luz del fondo. Nunca va encima de otro vidrio
            de marco.
          </p>
        </div>
        <div className="superficie-datos rounded-2xl p-5">
          <h2 className="font-semibold">Superficie de datos</h2>
          <p className="mt-1 text-sm text-ink-2">
            Gráficas, tablas e indicadores. Casi opaca: el contraste del texto no depende de lo que
            haya detrás.
          </p>
        </div>
        <div className="vidrio-flotante rounded-2xl p-5">
          <h2 className="font-semibold">Vidrio flotante</h2>
          <p className="mt-1 text-sm text-ink-2">
            Menús, hojas de detalle y panel de demo. Más desenfoque y sombra más profunda.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard titulo="Marca" descripcion={`Rampa derivada del tono ${preset.marca.tono}°`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Muestra nombre="Marca 700" variable="--brand-700" nota="Enlaces y texto de marca" />
            <Muestra nombre="Marca 600" variable="--brand-600" nota="Botones primarios" />
            <Muestra nombre="Marca 500" variable="--brand-500" nota="Gráficas, iconos, foco" />
            <Muestra nombre="Marca 100" variable="--brand-100" nota="Fondos suaves" />
            <Muestra nombre="Tinta" variable="--ink" nota="Texto principal" />
            <Muestra nombre="Tinta secundaria" variable="--ink-2" nota="Etiquetas y ejes" />
          </div>
        </DataCard>

        <DataCard titulo="Estados y series" descripcion="No cambian con la marca">
          <div className="grid gap-3 sm:grid-cols-2">
            <Muestra nombre="Bien" variable="--ok" />
            <Muestra nombre="Alerta" variable="--alerta" />
            <Muestra nombre="Serio" variable="--serio" />
            <Muestra nombre="Crítico" variable="--critico" />
          </div>
          <div className="mt-4 flex h-3.5 gap-0.5 overflow-hidden rounded-[4px]" aria-label="Orden de las series">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n} className="flex-1" style={{ background: `var(--serie-${n})` }} />
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-2">
            Orden fijo de las series cuando una gráfica tiene varias.
          </p>
        </DataCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard titulo="Tipografía" descripcion="Source Sans 3 en toda la aplicación">
          <p className="titulo-pagina">Título de página, peso ligero</p>
          <p className="cifra mt-4 text-[2.125rem]">{formato.moneda(48965)}</p>
          <p className="mt-4 font-semibold">Título de tarjeta, seminegrita</p>
          <p className="mt-1">Texto de lectura. Las ventas subieron frente al periodo anterior.</p>
          <p className="mt-1 text-sm text-ink-2">Texto secundario para etiquetas y descripciones.</p>
        </DataCard>

        <DataCard titulo="Piezas" descripcion="Botones, cambios, segmentos y probabilidad">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Acción principal</Button>
            <Button variant="outline">Acción secundaria</Button>
            <Button variant="ghost">Acción discreta</Button>
            <Button variant="outline" onClick={() => abrirPanel(true)}>
              Abrir el panel de demo
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Cambio valor={0.095} formato={formato} />
            <Cambio valor={-0.022} formato={formato} />
            <Cambio valor={0} formato={formato} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {SEGMENTOS.map((id) => (
              <EtiquetaSegmento key={id} id={id} nombres={preset.segmentos} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <EtiquetaBanda banda="alta" />
            <EtiquetaBanda banda="media" />
            <EtiquetaBanda banda="baja" />
            <MedidorProbabilidad puntaje={84} formato={formato} className="w-36" />
          </div>
        </DataCard>
      </div>
    </div>
  );
}
