import { FileText, LayoutDashboard, Target, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { mayuscula } from "@/tenants/rubros";
import type { Preset } from "@/tenants/schema";

export interface Seccion {
  href: string;
  icono: LucideIcon;
  titulo(preset: Preset): string;
  /** Las secciones con filtros muestran periodo y zona en la barra superior. */
  conFiltros: boolean;
}

export const SECCIONES: Seccion[] = [
  { href: "/resumen", icono: LayoutDashboard, titulo: () => "Resumen", conFiltros: true },
  { href: "/ventas", icono: TrendingUp, titulo: () => "Ventas", conFiltros: true },
  {
    href: "/clientes",
    icono: Users,
    titulo: (preset) => mayuscula(preset.vocabulario.cliente.plural),
    conFiltros: false,
  },
  { href: "/oportunidades", icono: Target, titulo: () => "Oportunidades", conFiltros: false },
  { href: "/reportes", icono: FileText, titulo: () => "Reportes", conFiltros: false },
];

export function seccionDe(ruta: string): Seccion | undefined {
  return SECCIONES.find((s) => ruta === s.href || ruta.startsWith(`${s.href}/`));
}
