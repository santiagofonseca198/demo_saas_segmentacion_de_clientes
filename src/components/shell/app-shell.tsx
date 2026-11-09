"use client";

import type { ReactNode } from "react";
import { useDemo } from "@/state/demo";
import { Arranque } from "./arranque";
import { DemoPanel } from "./demo-panel";
import { Sidebar } from "./sidebar";
import { TemaDeMarca } from "./tema-de-marca";
import { Topbar } from "./topbar";

function Esqueleto() {
  return (
    <div aria-hidden className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="superficie-datos h-[132px] rounded-2xl" />
        ))}
      </div>
      <div className="superficie-datos h-[340px] rounded-2xl" />
    </div>
  );
}

/** Marco de la aplicación: fondo, barra lateral, barra superior y panel de demo. */
export function AppShell({ children }: { children: ReactNode }) {
  const listo = useDemo((estado) => estado.listo);

  return (
    <div className="relative min-h-dvh">
      <div className="fondo-claro" aria-hidden />
      <Arranque />
      <TemaDeMarca />
      <Sidebar />
      <div className="area-imprimible relative z-10 pl-[92px] pr-3 lg:pl-[256px]">
        {/* Barra superior y contenido comparten ancho máximo para quedar alineados. */}
        <div className="area-imprimible mx-auto max-w-[1680px]">
          <Topbar />
          <main className="area-imprimible px-1 pb-12 pt-4 lg:px-3">
            {!listo && <Esqueleto />}
            {/* La página siempre se monta; solo se oculta hasta conocer la empresa guardada. */}
            <div hidden={!listo}>{children}</div>
          </main>
        </div>
      </div>
      <DemoPanel />
    </div>
  );
}
