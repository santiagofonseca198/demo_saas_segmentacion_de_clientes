"use client";

import { Download, RotateCcw, Shuffle, Upload, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TONOS_SUGERIDOS, colorDeMarca } from "@/lib/theme/brand";
import { cn } from "@/lib/utils";
import { useDemo } from "@/state/demo";
import { PRESETS } from "@/tenants";
import { NOMBRE_RUBRO, etiquetaKpi } from "@/tenants/rubros";
import {
  KPI_IDS,
  MONEDAS,
  RUBROS,
  type KpiId,
  type MonedaId,
  type Preset,
  type Rubro,
  type Termino,
} from "@/tenants/schema";

const LOGO_MAXIMO_KB = 400;

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline py-5 first:border-t-0 first:pt-1">
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Campo({ etiqueta, htmlFor, children }: { etiqueta: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-ink-2">
        {etiqueta}
      </Label>
      {children}
    </div>
  );
}

/** Texto que no puede quedar vacío: mientras lo está, no se guarda y se marca. */
function CampoTexto({
  valor,
  alCambiar,
  ...props
}: {
  valor: string;
  alCambiar(valor: string): void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const [vacio, setVacio] = useState(false);
  return (
    <Input
      {...props}
      value={vacio ? "" : valor}
      aria-invalid={vacio || undefined}
      onChange={(evento) => {
        const texto = evento.target.value;
        setVacio(texto.trim() === "");
        if (texto.trim() !== "") alCambiar(texto);
      }}
      onBlur={() => setVacio(false)}
      className={cn("bg-white/70", props.className)}
    />
  );
}

function Deslizador({
  etiqueta,
  valor,
  alCambiar,
  min = 0,
  max = 1,
  paso = 0.05,
  className,
}: {
  etiqueta: string;
  valor: number;
  alCambiar(valor: number): void;
  min?: number;
  max?: number;
  paso?: number;
  className?: string;
}) {
  return (
    <Slider
      aria-label={etiqueta}
      min={min}
      max={max}
      step={paso}
      value={[valor]}
      onValueChange={(nuevo) => alCambiar(Array.isArray(nuevo) ? nuevo[0] : nuevo)}
      className={className}
    />
  );
}

function leerArchivo(archivo: File, modo: "texto" | "dataUrl"): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(lector.error);
    if (modo === "texto") lector.readAsText(archivo);
    else lector.readAsDataURL(archivo);
  });
}

function Contenido() {
  const id = useId();
  const preset = useDemo((estado) => estado.preset);
  const { actualizar, cargarPreset, cambiarRubro, importar, restablecer } = useDemo.getState();
  const [aviso, setAviso] = useState<{ tipo: "error" | "ok"; lineas: string[] } | null>(null);
  const archivoLogo = useRef<HTMLInputElement>(null);
  const archivoPreset = useRef<HTMLInputElement>(null);

  const cambiar = (parcial: (p: Preset) => Partial<Preset>) =>
    actualizar((p) => ({ ...p, ...parcial(p) }));

  const cambiarTermino = (clave: keyof Preset["vocabulario"], cambio: Partial<Termino>) =>
    cambiar((p) => ({
      vocabulario: { ...p.vocabulario, [clave]: { ...p.vocabulario[clave], ...cambio } },
    }));

  const alternarKpi = (kpi: KpiId, activo: boolean) =>
    cambiar((p) => ({
      // Se conserva el orden del catálogo, no el orden en que se activan.
      kpis: KPI_IDS.filter((k) => (k === kpi ? activo : p.kpis.includes(k))),
    }));

  const alElegirLogo = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > LOGO_MAXIMO_KB * 1024) {
      setAviso({
        tipo: "error",
        lineas: [`El logo pesa más de ${LOGO_MAXIMO_KB} KB. Usa una imagen más liviana.`],
      });
      return;
    }
    const logo = await leerArchivo(archivo, "dataUrl");
    cambiar((p) => ({ empresa: { ...p.empresa, logo } }));
    setAviso(null);
  };

  const alImportar = async (archivo: File | undefined) => {
    if (!archivo) return;
    let entrada: unknown;
    try {
      entrada = JSON.parse(await leerArchivo(archivo, "texto"));
    } catch {
      setAviso({ tipo: "error", lineas: ["El archivo no es un JSON válido."] });
      return;
    }
    const resultado = importar(entrada);
    setAviso(
      resultado.ok
        ? { tipo: "ok", lineas: [`Se cargó ${resultado.preset.empresa.nombre}.`] }
        : { tipo: "error", lineas: ["El archivo no se cargó:", ...resultado.errores] },
    );
  };

  const exportar = () => {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(
      new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" }),
    );
    enlace.download = `${preset.id}.json`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const presetConocido = PRESETS.some((p) => p.id === preset.id);
  const opcionesPreset = [
    ...PRESETS.map((p) => ({ value: p.id, label: p.empresa.nombre })),
    ...(presetConocido ? [] : [{ value: preset.id, label: `${preset.empresa.nombre} (importado)` }]),
  ];
  const opcionesRubro = RUBROS.map((r) => ({ value: r, label: NOMBRE_RUBRO[r] }));
  const opcionesMoneda = (Object.keys(MONEDAS) as MonedaId[]).map((m) => ({
    value: m,
    label: MONEDAS[m].nombre,
  }));
  const opcionesGenero = [
    { value: "m", label: "el / los" },
    { value: "f", label: "la / las" },
  ];

  return (
    <>
      <Grupo titulo="Empresa">
        <Campo etiqueta="Empezar desde" htmlFor={`${id}-preset`}>
          <Select
            items={opcionesPreset}
            value={preset.id}
            onValueChange={(valor) => {
              cargarPreset(valor as string);
              setAviso(null);
            }}
          >
            <SelectTrigger id={`${id}-preset`} className="w-full bg-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {opcionesPreset.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo etiqueta="Nombre" htmlFor={`${id}-nombre`}>
          <CampoTexto
            id={`${id}-nombre`}
            maxLength={40}
            valor={preset.empresa.nombre}
            alCambiar={(nombre) => cambiar((p) => ({ empresa: { ...p.empresa, nombre } }))}
          />
        </Campo>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={archivoLogo}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(evento) => {
              void alElegirLogo(evento.target.files?.[0]);
              evento.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => archivoLogo.current?.click()}>
            <Upload aria-hidden />
            {preset.empresa.logo ? "Cambiar logo" : "Subir logo"}
          </Button>
          {preset.empresa.logo && (
            <Button
              variant="ghost"
              onClick={() => cambiar((p) => ({ empresa: { ...p.empresa, logo: null } }))}
            >
              Quitar logo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Rubro" htmlFor={`${id}-rubro`}>
            <Select
              items={opcionesRubro}
              value={preset.rubro}
              onValueChange={(valor) => cambiarRubro(valor as Rubro)}
            >
              <SelectTrigger id={`${id}-rubro`} className="w-full bg-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {opcionesRubro.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo etiqueta="Moneda" htmlFor={`${id}-moneda`}>
            <Select
              items={opcionesMoneda}
              value={preset.moneda}
              onValueChange={(valor) => cambiar(() => ({ moneda: valor as MonedaId }))}
            >
              <SelectTrigger id={`${id}-moneda`} className="w-full bg-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-56">
                {opcionesMoneda.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </div>
      </Grupo>

      <Grupo titulo="Color de marca">
        <div className="flex flex-wrap gap-2">
          {TONOS_SUGERIDOS.map((sugerido) => {
            const activo = Math.abs(preset.marca.tono - sugerido.tono) < 1;
            return (
              <button
                key={sugerido.tono}
                type="button"
                aria-label={sugerido.nombre}
                aria-pressed={activo}
                title={sugerido.nombre}
                onClick={() => cambiar(() => ({ marca: { tono: sugerido.tono } }))}
                style={{ backgroundColor: colorDeMarca(sugerido.tono, 600) }}
                className={cn(
                  "size-8 rounded-full border-2 border-white shadow-sm transition-transform active:scale-95",
                  activo && "ring-2 ring-ink ring-offset-1",
                )}
              />
            );
          })}
        </div>
        <div
          className="rounded-full p-1.5"
          style={{
            background:
              "linear-gradient(90deg in oklch longer hue, oklch(0.8 0.1 0), oklch(0.8 0.1 360))",
          }}
        >
          <Deslizador
            etiqueta="Tono de marca"
            min={0}
            max={360}
            paso={1}
            valor={preset.marca.tono}
            alCambiar={(tono) => cambiar(() => ({ marca: { tono } }))}
            className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-transparent"
          />
        </div>
      </Grupo>

      <Grupo titulo="Indicadores del resumen">
        <p className="-mt-1 text-sm text-ink-2">Entre dos y cuatro.</p>
        {KPI_IDS.map((kpi) => {
          const activo = preset.kpis.includes(kpi);
          const bloqueado = activo ? preset.kpis.length <= 2 : preset.kpis.length >= 4;
          return (
            <div key={kpi} className="flex items-center justify-between gap-3">
              <Label htmlFor={`${id}-kpi-${kpi}`} className={cn(bloqueado && "text-ink-2")}>
                {etiquetaKpi(kpi, preset)}
              </Label>
              <Switch
                id={`${id}-kpi-${kpi}`}
                checked={activo}
                disabled={bloqueado}
                onCheckedChange={(marcado) => alternarKpi(kpi, marcado)}
              />
            </div>
          );
        })}
      </Grupo>

      <Grupo titulo="Vocabulario">
        {(
          [
            ["cliente", "A quién le vende"],
            ["pedido", "Cada venta"],
            ["zona", "Cómo divide el negocio"],
          ] as const
        ).map(([clave, etiqueta]) => (
          <fieldset key={clave} className="grid gap-1.5">
            <legend className="mb-1.5 text-sm text-ink-2">{etiqueta}</legend>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <CampoTexto
                aria-label={`${etiqueta}, en singular`}
                maxLength={24}
                valor={preset.vocabulario[clave].singular}
                alCambiar={(singular) => cambiarTermino(clave, { singular })}
              />
              <CampoTexto
                aria-label={`${etiqueta}, en plural`}
                maxLength={24}
                valor={preset.vocabulario[clave].plural}
                alCambiar={(plural) => cambiarTermino(clave, { plural })}
              />
              <Select
                items={opcionesGenero}
                value={preset.vocabulario[clave].genero}
                onValueChange={(valor) => cambiarTermino(clave, { genero: valor as "m" | "f" })}
              >
                <SelectTrigger aria-label={`${etiqueta}, artículo`} className="bg-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="end">
                  {opcionesGenero.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>
        ))}
      </Grupo>

      <Grupo titulo="Nombres de los segmentos">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(preset.segmentos) as (keyof Preset["segmentos"])[]).map((clave) => (
            <CampoTexto
              key={clave}
              aria-label={`Nombre del segmento ${preset.segmentos[clave]}`}
              maxLength={24}
              valor={preset.segmentos[clave]}
              alCambiar={(nombre) =>
                cambiar((p) => ({ segmentos: { ...p.segmentos, [clave]: nombre } }))
              }
            />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Apariencia">
        <Campo etiqueta="Luz del fondo">
          <Deslizador
            etiqueta="Luz del fondo"
            valor={preset.apariencia.fondo}
            alCambiar={(fondo) => cambiar((p) => ({ apariencia: { ...p.apariencia, fondo } }))}
          />
        </Campo>
        <Campo etiqueta="Transparencia del marco">
          <Deslizador
            etiqueta="Transparencia del marco"
            valor={preset.apariencia.vidrio}
            alCambiar={(vidrio) => cambiar((p) => ({ apariencia: { ...p.apariencia, vidrio } }))}
          />
        </Campo>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor={`${id}-proyector`}>Modo proyector</Label>
            <p className="text-sm text-ink-2">Más contraste y sin transparencias.</p>
          </div>
          <Switch
            id={`${id}-proyector`}
            checked={preset.apariencia.proyector}
            onCheckedChange={(proyector) =>
              cambiar((p) => ({ apariencia: { ...p.apariencia, proyector } }))
            }
          />
        </div>
      </Grupo>

      {preset.datos.fuente === "dunnhumby" ? (
        <Grupo titulo="Datos reales">
          <p className="text-sm text-ink-2">
            Compras de 2017 de una muestra de hogares de dunnhumby (The Complete Journey). Los
            segmentos y las probabilidades vienen de los modelos de la carpeta{" "}
            <span className="font-mono">ml/</span> del proyecto.
          </p>
        </Grupo>
      ) : (
        <Grupo titulo="Datos de ejemplo">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                cambiar((p) => ({
                  datos: { ...p.datos, semilla: Math.floor(Math.random() * 1_000_000) },
                }))
              }
            >
              <Shuffle aria-hidden />
              Generar otros datos
            </Button>
          </div>
          <p className="text-sm text-ink-2">
            Los datos son ficticios. Cada semilla produce siempre las mismas cifras; la actual es{" "}
            <span className="tabular">{preset.datos.semilla}</span>.
          </p>
        </Grupo>
      )}

      <Grupo titulo="Guardar y cargar">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportar}>
            <Download aria-hidden />
            Exportar preset
          </Button>
          <input
            ref={archivoPreset}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(evento) => {
              void alImportar(evento.target.files?.[0]);
              evento.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => archivoPreset.current?.click()}>
            <Upload aria-hidden />
            Importar preset
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              restablecer();
              setAviso(null);
            }}
          >
            <RotateCcw aria-hidden />
            Restablecer
          </Button>
        </div>
        {aviso && (
          <div
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              aviso.tipo === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-brand-200 bg-brand-50 text-ink",
            )}
          >
            {aviso.lineas.map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
          </div>
        )}
      </Grupo>
    </>
  );
}

/**
 * Panel de demo: personaliza la empresa en vivo, sin recargar. No bloquea la
 * página, para que los cambios se vean mientras se hacen.
 * Se abre con Ctrl + punto o con `?demo=1` en la URL.
 */
export function DemoPanel() {
  const abierto = useDemo((estado) => estado.panelAbierto);
  const abrirPanel = useDemo((estado) => estado.abrirPanel);
  const sinMovimiento = useReducedMotion();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!abierto) return;
    panel.current?.focus();
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !evento.defaultPrevented) abrirPanel(false);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto, abrirPanel]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.aside
          ref={panel}
          tabIndex={-1}
          aria-label="Panel de demo"
          initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, x: 32 }}
          transition={sinMovimiento ? { duration: 0.15 } : { type: "spring", bounce: 0, duration: 0.35 }}
          className="vidrio-flotante no-imprimir fixed inset-y-3 right-3 z-40 flex w-[min(400px,calc(100vw-1.5rem))] flex-col rounded-3xl outline-none"
        >
          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
            <div>
              <h2 className="text-lg font-semibold leading-tight">Panel de demo</h2>
              <p className="text-sm text-ink-2">Los cambios se ven al instante.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar el panel de demo"
              onClick={() => abrirPanel(false)}
            >
              <X aria-hidden />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <Contenido />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
