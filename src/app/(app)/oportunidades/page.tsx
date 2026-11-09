import type { Metadata } from "next";
import { Oportunidades } from "@/features/oportunidades/oportunidades";

export const metadata: Metadata = { title: "Oportunidades" };

export default function PaginaOportunidades() {
  return <Oportunidades />;
}
