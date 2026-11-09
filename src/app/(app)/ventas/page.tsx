import type { Metadata } from "next";
import { Ventas } from "@/features/ventas/ventas";

export const metadata: Metadata = { title: "Ventas" };

export default function PaginaVentas() {
  return <Ventas />;
}
