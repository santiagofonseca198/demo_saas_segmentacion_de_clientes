import type { Metadata } from "next";
import { Segmentos } from "@/features/segmentos/segmentos";

export const metadata: Metadata = { title: "Segmentación" };

export default function PaginaClientes() {
  return <Segmentos />;
}
