# Sistema visual: "Aero claro"

Guía para todo el equipo. Describe las decisiones de diseño del front y dónde vive cada una en el código. La galería en vivo está en `/sistema`.

## Idea central

Software corporativo con el optimismo de Frutiger Aero, sin recargar.

- El optimismo viene de la **luz**: tonos claros y limpios, verdes frescos y un brillo fino en los bordes del vidrio.
- No viene de la decoración: sin burbujas, destellos, fotos de naturaleza ni degradados intensos.
- Los datos van sobre superficies tranquilas y casi opacas.
- Ante la duda entre un efecto más vistoso y uno más discreto, se elige el discreto.

## Color

Todos los tokens están en `src/app/globals.css`.

### Marca

La rampa de marca sale de **un solo número**: el tono (`--brand-h`, de 0 a 360). La luminosidad y la saturación están fijas, así que el contraste se mantiene con cualquier tono. Una prueba (`src/tenants/presets.test.ts`) comprueba que el texto blanco sobre el color de botones cumple 4.5:1 en los 360 tonos.

| Token | Uso |
|---|---|
| `--brand-700` | Enlaces y texto de marca |
| `--brand-600` | Botones primarios (texto blanco encima) |
| `--brand-500` | Gráficas de una sola serie, iconos, anillo de foco. No lleva texto blanco encima |
| `--brand-200`, `--brand-100`, `--brand-50` | Fondos suaves, pistas de medidores |
| `--ink` | Texto principal |
| `--ink-2` | Etiquetas, ejes, descripciones |
| `--lima` | Acento puntual (el punto del monograma). No se usa en fondos, texto ni estados |

Con el tono por defecto (166) los valores equivalen a: tinta `#0D2B24`, secundario `#47645C`, marca 600 `#0F7A5A`, marca 500 `#129E74`.

### Estados

Fijos; no cambian con la marca. Siempre van con icono y texto, nunca solo color.

| Estado | Hex |
|---|---|
| Bien | `#0CA30C` (texto: `#006300`) |
| Alerta | `#FAB219` |
| Serio | `#EC835A` |
| Crítico | `#D03B3B` (texto: `#B42318`) |

### Gráficas

- **Una serie:** color de marca (`--brand-500`).
- **Comparación con el periodo anterior:** el anterior va en gris neutro y punteado.
- **Varias series:** orden fijo `--serie-1` a `--serie-6` (`#129E74, #2A78D6, #EB6834, #6250D6, #EDA100, #E87BA4`). Está validado para daltonismo sobre la superficie de datos. Amarillo y magenta tienen bajo contraste, así que esas series llevan etiqueta directa.
- **Segmentos:** color **y** forma (círculo, cuadrado, triángulo, rombo), más un rótulo en el centro de cada grupo en el mapa. Verde, azul y naranja se distinguen bien entre sí; el cuarto segmento va en gris neutro porque ningún cuarto tono pasaba la validación. Definido en `src/lib/data/segmentos-visual.ts`.
- No se usan dos ejes verticales en una misma gráfica.
- El texto de las gráficas va en tinta, nunca en el color de la serie.

Si se cambia un color de serie, hay que volver a validar la paleta para daltonismo.

## Tipografía

Una sola familia: **Source Sans 3** (humanista, en la línea de Frutiger y Segoe UI).

| Uso | Estilo |
|---|---|
| Título de página | Clase `.titulo-pagina`: 28 px, peso 300, tracking −0.02em |
| Cifra grande | Clase `.cifra`: peso 300, tracking −0.025em |
| Título de tarjeta | 16 px, peso 600 |
| Texto | 15 px, peso 400 |
| Secundario | 14 px, color `--ink-2` |

Las cifras tabulares (`.tabular`) solo se usan en tablas y ejes. Las etiquetas van en minúscula normal, sin mayúsculas sostenidas.

## Materiales

| Clase | Dónde | Qué es |
|---|---|---|
| `.vidrio-marco` | Barra lateral y barra superior | Blanco translúcido con desenfoque de 24 px y borde superior brillante |
| `.superficie-datos` | Tarjetas con gráficas, tablas e indicadores | Blanco al 86 %, sin desenfoque. El contraste del texto es predecible |
| `.vidrio-flotante` | Menús, hoja de detalle, panel de demo, tooltips | Blanco al 78 %, desenfoque de 32 px, sombra más profunda |

Reglas:

- Nunca vidrio de marco sobre vidrio de marco.
- Máximo tres capas con desenfoque visibles a la vez.
- Las gráficas y las tablas van siempre sobre `.superficie-datos`.

### Fondo

Clase `.fondo-claro`: base casi blanca con un tinte leve del tono de marca y dos halos de luz difusos. Es estático. Si alguien nota el fondo antes que los datos, está demasiado fuerte.

### Adaptaciones automáticas

| Situación | Qué pasa |
|---|---|
| Modo proyector (panel de demo) | Superficies casi opacas, sin desenfoque, texto secundario más oscuro |
| `prefers-reduced-transparency` | Igual que el modo proyector |
| `prefers-contrast: more` | Superficies sólidas y bordes más marcados |
| Navegador sin `backdrop-filter` | Superficies sólidas |
| `prefers-reduced-motion` | Sin secuencia de entrada ni deslizamientos; solo fundidos cortos |

## Movimiento

- Resortes sin rebote (unos 0.35 s) en la píldora de navegación, el panel de demo y la hoja de detalle.
- Los botones responden al presionar con una reducción leve de escala.
- Una sola secuencia de entrada (clase `.entrada`), al cargar el Resumen.
- Las gráficas no se animan al aparecer.

## Redacción

- Los modelos se muestran en lenguaje de negocio: "Fieles" o "En riesgo", no "Cluster 3"; "Qué hacer", no "Recomendación del modelo".
- La explicación técnica va en un desplegable "Cómo se calculó".
- Un botón dice lo que hace: "Exportar a CSV", "Generar reporte".
- Los estados vacíos dicen qué pasó y cómo seguir.
- El vocabulario de cada empresa (cliente o cuenta, compra o pedido, sucursal o zona) sale del preset, con su género gramatical para concordar artículos.

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Tokens, materiales, impresión | `src/app/globals.css` |
| Rampa de marca en TypeScript | `src/lib/theme/brand.ts` |
| Marco de la aplicación | `src/components/shell/` |
| Piezas de gráficas | `src/components/charts/` |
| Tarjeta de datos | `src/components/glass/data-card.tsx` |
| Componentes base (shadcn/ui) | `src/components/ui/` |
