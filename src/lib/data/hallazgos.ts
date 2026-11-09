import type { Formato } from "@/lib/format";
import type { Preset } from "@/tenants/schema";
import { calcularKpis, ventasPor } from "./consultas";
import { plural } from "./textos";
import type { Dataset, Filtros } from "./types";

export interface Hallazgo {
  tono: "positivo" | "atencion";
  texto: string;
  enlace: "/ventas" | "/clientes" | "/oportunidades";
  enlaceTexto: string;
}

/**
 * Las tres cosas más importantes del periodo, redactadas a partir de los
 * mismos números que muestra el resto del tablero.
 */
export function hallazgos(ds: Dataset, filtros: Filtros, preset: Preset, formato: Formato): Hallazgo[] {
  const { cliente } = preset.vocabulario;
  const lista: Hallazgo[] = [];

  const [ventas] = calcularKpis(ds, filtros, ["ventas"]);
  if (ventas.cambio !== null) {
    const subio = ventas.cambio >= 0;
    const categorias = ventasPor(ds, filtros, "categoria")
      .map((c) => ({ nombre: c.nombre, diferencia: c.valor - (c.anterior ?? 0) }))
      .sort((a, b) => (subio ? b.diferencia - a.diferencia : a.diferencia - b.diferencia));
    const principal = categorias[0];
    const detalle = principal
      ? ` ${principal.nombre} fue la categoría que más ${subio ? "aportó" : "pesó"}: ${formato.moneda(
          Math.abs(principal.diferencia),
        )} ${principal.diferencia >= 0 ? "más" : "menos"}.`
      : "";
    lista.push({
      tono: subio ? "positivo" : "atencion",
      texto: `Las ventas ${subio ? "subieron" : "bajaron"} ${formato.porcentaje(
        Math.abs(ventas.cambio),
        1,
      )} frente al periodo anterior.${detalle}`,
      enlace: "/ventas",
      enlaceTexto: "Ver ventas",
    });
  }

  const valores = ds.clientes.map((c) => c.valor).sort((a, b) => a - b);
  const valorMediano = valores[Math.floor(valores.length / 2)] ?? 0;
  const enRiesgo = ds.clientes.filter((c) => c.segmento === "enRiesgo" && c.valor > valorMediano);
  if (enRiesgo.length > 0) {
    const gasto = enRiesgo.reduce((suma, c) => suma + c.valor, 0);
    lista.push({
      tono: "atencion",
      texto: `${enRiesgo.length} ${plural(enRiesgo.length, cliente)} de alto valor ${
        enRiesgo.length === 1 ? "lleva" : "llevan"
      } más de 60 días sin comprar. En el último año ${
        enRiesgo.length === 1 ? "gastó" : "gastaron"
      } ${formato.moneda(gasto, { compacta: true })}.`,
      enlace: "/clientes",
      enlaceTexto: `Ver ${preset.segmentos.enRiesgo.toLowerCase()}`,
    });
  }

  const altas = ds.clientes.filter((c) => c.propension.banda === "alta");
  if (altas.length > 0) {
    const esperado = altas.reduce((suma, c) => suma + c.propension.valorEsperado, 0);
    lista.push({
      tono: "positivo",
      texto: `${altas.length} ${plural(altas.length, cliente)} ${
        altas.length === 1 ? "tiene" : "tienen"
      } probabilidad alta de comprar en los próximos ${ds.ventanaPropension} días, por un valor esperado de ${formato.moneda(
        esperado,
        { compacta: true },
      )}.`,
      enlace: "/oportunidades",
      enlaceTexto: "Ver oportunidades",
    });
  }

  return lista;
}
