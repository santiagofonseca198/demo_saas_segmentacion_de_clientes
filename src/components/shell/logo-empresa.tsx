import { cn } from "@/lib/utils";

function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p));
  const letras = (palabras.length ? palabras : [nombre]).slice(0, 2).map((p) => p.charAt(0));
  return letras.join("").toUpperCase();
}

/** Logo de la empresa; si no hay imagen, un monograma con el color de marca. */
export function LogoEmpresa({
  nombre,
  logo,
  className,
}: {
  nombre: string;
  logo: string | null;
  className?: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- el logo es un data URL que sube el usuario
      <img
        src={logo}
        alt={`Logo de ${nombre}`}
        className={cn("size-9 shrink-0 rounded-xl bg-white object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-[13px] font-semibold tracking-wide text-white",
        className,
      )}
    >
      {iniciales(nombre)}
      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-lima" />
    </span>
  );
}
