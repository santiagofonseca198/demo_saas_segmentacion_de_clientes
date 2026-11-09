import type { Metadata } from "next";
import { Reportes } from "@/features/reportes/reportes";

export const metadata: Metadata = { title: "Reportes" };

export default function PaginaReportes() {
  return <Reportes />;
}
