/**
 * Descarga una tabla como archivo CSV. Usa punto y coma y marca BOM para que
 * Excel en español lo abra en columnas y con tildes correctas.
 */
export function descargarCsv(nombre: string, columnas: string[], filas: (string | number)[][]): void {
  const celda = (valor: string | number) => {
    const texto = String(valor);
    return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
  };
  const contenido = [columnas, ...filas].map((fila) => fila.map(celda).join(";")).join("\r\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob(["\ufeff", contenido], { type: "text/csv;charset=utf-8" }));
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
