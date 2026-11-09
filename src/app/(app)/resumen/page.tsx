import type { Metadata } from "next";
import { Resumen } from "@/features/resumen/resumen";

export const metadata: Metadata = { title: "Resumen" };

export default function PaginaResumen() {
  return <Resumen />;
}
