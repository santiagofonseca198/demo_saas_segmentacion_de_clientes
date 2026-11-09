import type { Metadata } from "next";
import { Sistema } from "@/features/sistema/sistema";

export const metadata: Metadata = { title: "Sistema visual" };

export default function PaginaSistema() {
  return <Sistema />;
}
