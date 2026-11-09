"use client";

import { Check, Copy, LoaderCircle, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DataCard } from "@/components/glass/data-card";
import { Button } from "@/components/ui/button";
import {
  interpretarPregunta,
  plantillas,
  type Reporte,
  type TipoReporte,
} from "@/lib/data/reportes";
import { repositorio } from "@/lib/data/repository";
import { cn } from "@/lib/utils";
import { claveDeDatos, useFormato, usePreset } from "@/state/demo";
import { Documento, reporteATexto } from "./documento";

/** Tiempo que el agente simulado dedica a cada paso. */
const MS_POR_PASO = 650;

interface Generado {
  reporte: Reporte;
  pregunta: string | null;
}

function Agente() {
  const preset = usePreset();
  const formato = useFormato();
  const [pregunta, setPregunta] = useState("");
  const [enCurso, setEnCurso] = useState<(Generado & { paso: number }) | null>(null);
  const [actual, setActual] = useState<Generado | null>(null);
  const [historial, setHistorial] = useState<Generado[]>([]);
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);

  const generar = async (tipo: TipoReporte, textoPregunta: string | null) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    const generado: Generado = {
      reporte: await repositorio.reporte(preset, tipo),
      pregunta: textoPregunta,
    };
    setCopiado(false);
    const avanzar = (paso: number) => {
      if (paso >= generado.reporte.pasos.length) {
        setEnCurso(null);
        setActual(generado);
        setHistorial((previo) => [
          generado,
          ...previo.filter((h) => h.reporte.tipo !== tipo || h.pregunta !== textoPregunta),
        ]);
        return;
      }
      setEnCurso({ ...generado, paso });
      temporizador.current = setTimeout(() => avanzar(paso + 1), MS_POR_PASO);
    };
    avanzar(0);
  };

  const copiar = async () => {
    if (!actual) return;
    await navigator.clipboard.writeText(reporteATexto(actual.reporte, preset.empresa.nombre));
    setCopiado(true);
  };

  const ocupado = enCurso !== null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-12">
      <div className="no-imprimir grid gap-4 xl:col-span-4">
        <DataCard
          titulo="Pide un reporte"
          descripcion={`El agente lo arma con los datos de ${preset.empresa.nombre}`}
        >
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              const texto = pregunta.trim();
              if (texto) void generar(interpretarPregunta(texto), texto);
            }}
            className="grid gap-2"
          >
            <label htmlFor="pregunta" className="text-sm text-ink-2">
              Escribe una pregunta sobre el negocio
            </label>
            <textarea
              id="pregunta"
              rows={3}
              value={pregunta}
              onChange={(evento) => setPregunta(evento.target.value)}
              placeholder="¿Por qué cambiaron las ventas este mes?"
              className="w-full resize-none rounded-xl border border-input bg-white/70 px-3 py-2 placeholder:text-ink-2/70"
            />
            <div>
              <Button type="submit" size="lg" disabled={ocupado || pregunta.trim() === ""}>
                Generar reporte
              </Button>
            </div>
          </form>

          <h3 className="mb-2 mt-5 border-t border-hairline pt-4 text-sm text-ink-2">O elige uno</h3>
          <ul className="grid gap-2">
            {plantillas(preset).map((plantilla) => (
              <li key={plantilla.tipo}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void generar(plantilla.tipo, null)}
                  className="w-full rounded-xl border border-hairline bg-white/60 px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
                >
                  <span className="block font-semibold">{plantilla.titulo}</span>
                  <span className="block text-sm text-ink-2">{plantilla.descripcion}</span>
                </button>
              </li>
            ))}
          </ul>
        </DataCard>

        {historial.length > 0 && (
          <DataCard titulo="Reportes de esta sesión">
            <ul className="grid gap-1">
              {historial.map((generado) => (
                <li key={`${generado.reporte.tipo}:${generado.pregunta ?? ""}`}>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => setActual(generado)}
                    aria-current={actual === generado ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-brand-50",
                      actual === generado && "bg-brand-100 font-semibold",
                    )}
                  >
                    {generado.pregunta ?? generado.reporte.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </DataCard>
        )}
      </div>

      <div className="xl:col-span-8">
        {enCurso ? (
          <DataCard titulo="Preparando el reporte" descripcion={enCurso.reporte.titulo}>
            <ol className="grid gap-3" aria-live="polite">
              {enCurso.reporte.pasos.map((paso, i) => {
                const hecho = i < enCurso.paso;
                const activo = i === enCurso.paso;
                return (
                  <li
                    key={paso}
                    className={cn("flex items-center gap-3", !hecho && !activo && "text-ink-2/60")}
                  >
                    <span className="grid size-6 shrink-0 place-items-center">
                      {hecho ? (
                        <Check className="size-4 text-brand-600" aria-label="Listo" />
                      ) : activo ? (
                        <LoaderCircle
                          className="size-4 animate-spin text-brand-600 motion-reduce:animate-none"
                          aria-label="En curso"
                        />
                      ) : (
                        <span className="size-1.5 rounded-full bg-ink/25" aria-hidden />
                      )}
                    </span>
                    {paso}
                  </li>
                );
              })}
            </ol>
          </DataCard>
        ) : actual ? (
          <DataCard className="p-7">
            <div className="no-imprimir mb-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => void copiar()}>
                {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copiado ? "Texto copiado" : "Copiar texto"}
              </Button>
              <Button onClick={() => window.print()}>
                <Printer aria-hidden />
                Imprimir o guardar como PDF
              </Button>
            </div>
            <Documento
              reporte={actual.reporte}
              preset={preset}
              formato={formato}
              pregunta={actual.pregunta}
            />
          </DataCard>
        ) : (
          <DataCard className="min-h-[320px] justify-center p-8">
            <h2 className="titulo-pagina max-w-[18ch]">Todavía no hay un reporte abierto</h2>
            <p className="mt-3 max-w-[52ch] text-ink-2">
              Escribe una pregunta o elige uno de los reportes de la lista. El agente consulta las
              ventas, los segmentos y las probabilidades de compra, y entrega un documento listo para
              compartir.
            </p>
          </DataCard>
        )}
      </div>
    </div>
  );
}

export function Reportes() {
  const preset = usePreset();
  // Al cambiar de empresa o de datos, los reportes abiertos dejan de ser válidos.
  return <Agente key={claveDeDatos(preset)} />;
}
