# META-PROMPT: Sistema de Gestión de Mesas + Identificación por QR

> **Audiencia:** Agente de IA con acceso completo al repositorio.
> **Stack:** Next.js 15.4, Drizzle ORM + PostgreSQL (Supabase), Auth.js v5, Zustand, TanStack Query, Valibot, Tailwind v4, shadcn/ui, pnpm.
> **Dependencias existentes relevantes:** `@napi-rs/canvas` + `canvas` ya están en `devDependencies` — no agregar otra librería de canvas. `lucide-react`, `sonner`, `next-safe-action`, `@supabase/supabase-js` ya disponibles.

---

## DECISIÓN ARQUITECTURAL: QR vs NFC vs otros métodos

### Análisis comparativo para este contexto

| Método | Velocidad operacional | Costo de implementación | Hardware requerido | Veredicto |
|---|---|---|---|---|
| **QR por URL** | ~3s (abrir cámara) | $0 | Ninguno | ✅ Recomendado primario |
| **NFC tags** | ~0.5s (tap) | $0.5–2 por tag | Tags NFC + Android/iPhone XS+ | ✅ Recomendado secundario |
| **PIN numérico corto** | ~2s (teclear) | $0 | Ninguno | ✅ Fallback integrado |
| **Bluetooth Beacon** | Automático | Alto | Beacons + app nativa | ❌ Overkill para POS |
| **Código de barras 1D** | ~1.5s | $0 | Igual que QR | ❌ Sin ventaja sobre QR |

### Implementación elegida: QR de URL + PIN como fallback

**Por qué QR:**
- El QR codifica `https://[dominio]/m/[token]` — URL corta con token único por mesa.
- Al escanearlo, el waiter (o cliente) es redirigido al flujo correcto con la mesa pre-seleccionada.
- Costo de producción: imprimir en papel, laminar, pegar en la mesa. < $0.10/mesa.
- No requiere app instalada.

**Por qué URL-token y no nombre directo:**
- `token` de 8 caracteres alfanuméricos (ej. `t3b9kx4m`) es inmutable aunque la mesa se renombre.
- Evita URLs con caracteres especiales (`Mesa%201` vs `m/t3b9kx4m`).
- Permite revocar/regenerar el token sin cambiar la URL raíz.

**Por qué PIN como fallback:**
- El waiter puede escribir el número corto de mesa (1–3 dígitos) en el campo de `WaiterOrderClient` cuando no tiene cámara disponible o la mesa no tiene QR todavía.
- La integración ya existe: `tableNumber` en la action acepta cualquier string.

**Nota sobre NFC:**
- Instrucciones de configuración NFC se documentan en `README` de la feature — el tag NFC debe apuntar a la misma URL `https://[dominio]/m/[token]`. No requiere ningún cambio de código adicional vs QR: el sistema de redirección es idéntico.

---

## PARTE 1 — BASE DE DATOS

### 1.1 — Nueva tabla `restaurant_tables` en `src/db/schema/restaurant-tables.ts`

```ts
import { pgTable, uuid, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identidad visible
  label: text("label").notNull(), // "Mesa 1", "Barra 2", "Terraza A"
  section: text("section").default("Principal"), // zona/sección del salón
  capacity: integer("capacity").notNull().default(4),

  // Identificación QR/NFC
  qrToken: text("qr_token").notNull().unique(), // 8 chars alfanumérico, inmutable

  // Layout en el plano (coordenadas en grid de celdas de 40px)
  gridCol: integer("grid_col").notNull().default(1),
  gridRow: integer("grid_row").notNull().default(1),
  colSpan: integer("col_span").notNull().default(2), // ancho en celdas de grid
  rowSpan: integer("row_span").notNull().default(2), // alto en celdas de grid
  shape: text("shape").notNull().default("cuadrada").$type<"cuadrada" | "rectangle" | "circle">(),

  // Estado
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
});
```

### 1.2 — Exportar en `src/db/schema/index.ts`

```ts
export * from "./restaurant-tables";
```

### 1.3 — Queries en `src/db/queries/restaurant-tables.ts`

Implementar las siguientes funciones (todas `async`, retornan tipos inferidos de Drizzle):

- `getAllTables(): Promise<RestaurantTable[]>` — todas las mesas activas e inactivas, ordenadas por `section`, `grid_row`, `grid_col`.
- `getActiveTables(): Promise<RestaurantTable[]>` — solo `isActive = true`.
- `getTableByToken(token: string): Promise<RestaurantTable | undefined>` — para la ruta de redirección QR.
- `getTableById(id: string): Promise<RestaurantTable | undefined>`
- `createTable(data: NewTable): Promise<RestaurantTable>` — genera `qrToken` internamente con `nanoid(8)`.
- `updateTable(id: string, data: Partial<NewTable>): Promise<RestaurantTable>`
- `deleteTable(id: string): Promise<void>` — hard delete (las mesas se pueden eliminar libremente, no hay FK crítico).
- `regenerateToken(id: string): Promise<{ qrToken: string }>` — genera nuevo `nanoid(8)` y actualiza.
- `upsertTableLayout(updates: Array<{ id: string; gridCol: number; gridRow: number; colSpan: number; rowSpan: number }>): Promise<void>` — actualiza múltiples mesas en una transacción. Usado al guardar el layout del plano.

**Generación de token:**
```ts
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
// Usa alfabeto sin caracteres ambiguos (sin 0, O, I, 1, l)
```
Instalar: `pnpm add nanoid`. Es una dependencia de producción mínima (2 KB).

### 1.4 — Migración

```bash
pnpm db:generate
pnpm db:migrate
```

Verificar que la migración incluya: tabla `restaurant_tables` con constraint `UNIQUE` en `qr_token`.

---

## PARTE 2 — RUTA DE REDIRECCIÓN QR: `/m/[token]`

### 2.1 — `src/app/m/[token]/page.tsx`

Server component. Lógica:

1. Llamar `getTableByToken(params.token)`.
2. Si no existe → `notFound()`.
3. Si `isActive = false` → `redirect("/")` con mensaje de error (usar `searchParams`).
4. Si existe → `redirect("/waiter?table=" + encodeURIComponent(table.label))`.

```ts
import { notFound, redirect } from "next/navigation";
import { getTableByToken } from "@/db/queries/restaurant-tables";

export default async function TableQRPage({ params }: { params: { token: string } }) {
  const table = await getTableByToken(params.token);
  if (!table) notFound();
  if (!table.isActive) redirect("/?error=mesa-inactiva");
  redirect(`/waiter?table=${encodeURIComponent(table.label)}`);
}
```

No hay renderizado — es solo una redirección. Sin layout adicional.

### 2.2 — Integración con `WaiterOrderClient`

En `src/app/(waiter)/waiter/page.tsx`, leer el `searchParams`:

```ts
export default async function WaiterPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const prefilledTable = searchParams.table ?? "";
  // ... resto del data fetching
  return (
    <WaiterOrderClient
      // ...props existentes
      prefilledTable={prefilledTable}
    />
  );
}
```

En `WaiterOrderClient`, inicializar `tableNumber` con el prop:

```ts
const [tableNumber, setTableNumber] = useState(prefilledTable);
```

Si `prefilledTable` viene relleno, el campo de mesa aparece pre-completado y el mesero solo confirma y agrega items.

---

## PARTE 3 — SERVER ACTIONS: `src/actions/restaurant-tables.ts`

Todas usan `authenticatedActionClient` con guard `role === "admin"`. Implementar:

### `createTableAction`

Schema Valibot:
```ts
v.object({
  label: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  section: v.optional(v.string(), "Principal"),
  capacity: v.pipe(v.number(), v.minValue(1), v.maxValue(30)),
  shape: v.picklist(["cuadrada", "rectangle", "circle"]),
  gridCol: v.pipe(v.number(), v.integer(), v.minValue(1)),
  gridRow: v.pipe(v.number(), v.integer(), v.minValue(1)),
  colSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  rowSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
})
```

Llama `createTable(parsedInput)`. Retorna la mesa creada. `revalidatePath("/admin/tables")`.

### `updateTableAction`

Schema: igual que create + `id: v.string()`. Retorna la mesa actualizada. `revalidatePath("/admin/tables")`.

### `deleteTableAction`

Schema: `v.object({ id: v.string() })`. `revalidatePath("/admin/tables")`.

### `saveTableLayoutAction`

Schema:
```ts
v.object({
  updates: v.array(v.object({
    id: v.string(),
    gridCol: v.number(),
    gridRow: v.number(),
    colSpan: v.number(),
    rowSpan: v.number(),
  }))
})
```

Llama `upsertTableLayout(parsedInput.updates)`. `revalidatePath("/admin/tables")`. No hace nada con QR tokens.

### `regenerateTokenAction`

Schema: `v.object({ id: v.string() })`. Llama `regenerateToken(id)`. Retorna `{ qrToken }`. `revalidatePath("/admin/tables")`.

---

## PARTE 4 — GENERACIÓN DE QR (SERVER-SIDE)

### 4.1 — Dependencia

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

`qrcode` genera Data URLs PNG puros. No usa canvas en browser — funciona en Node.js.

### 4.2 — Utilidad `src/lib/qr.ts`

```ts
import QRCode from "qrcode";

export async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#1C0A00", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

export function buildTableQRUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/m/${token}`;
}
```

### 4.3 — API Route para QR individual: `GET /api/admin/tables/[id]/qr`

Archivo: `src/app/api/admin/tables/[id]/qr/route.ts`

- Validar sesión Auth.js (`role === "admin"`). 401 si no autorizado.
- Llamar `getTableById(id)`.
- Construir URL: `buildTableQRUrl(table.qrToken, process.env.NEXT_PUBLIC_APP_URL!)`.
- Generar PNG con `QRCode.toBuffer(url, { width: 600, margin: 3 })`.
- Retornar `new Response(buffer, { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="mesa-${table.label}.png"` } })`.

Este endpoint es llamado por el botón "Descargar QR" en la UI.

### 4.4 — API Route para impresión masiva: `GET /api/admin/tables/qr-sheet`

Archivo: `src/app/api/admin/tables/qr-sheet/route.ts`

- Validar sesión.
- Obtener todas las mesas activas con `getActiveTables()`.
- Generar un HTML con todos los QRs (como `<img>` con Data URLs base64) en formato imprimible:
  - Grid de 3 columnas, cada celda muestra el QR + label + sección + capacidad.
  - Media query `@media print` con page breaks correctos.
  - Botón "Imprimir" en el HTML que llama `window.print()`.
- Retornar `new Response(html, { headers: { "Content-Type": "text/html" } })`.

El administrador abre esta URL en el browser y usa Ctrl+P para imprimir todos los QRs.

---

## PARTE 5 — PÁGINA ADMIN: `/admin/tables`

### 5.1 — Server component: `src/app/(admin)/admin/tables/page.tsx`

Require admin auth. Fetch `getAllTables()`. Renderiza `<TableManagerClient tables={tables} />`.

### 5.2 — Componente cliente: `src/app/(admin)/admin/tables/TableManagerClient.tsx`

#### Layout general

Dos paneles en pantallas `lg+`, stack en mobile:

```
[Plano del salón — panel izquierdo, 65%]  |  [Listado/CRUD — panel derecho, 35%]
```

#### 5.2.1 — Panel del plano (FloorPlan)

**Grid sistema:**
- Canvas visual implementado con CSS Grid: `grid-template-columns: repeat(20, 40px)` × `grid-template-rows: repeat(15, 40px)`.
- Total: 20×15 celdas = 800×600 px de canvas. Escala con `transform: scale()` en pantallas pequeñas.
- Cada mesa ocupa `grid-column: span colSpan` / `grid-row: span rowSpan` en la posición `gridCol` / `gridRow`.

**Drag and drop:**
No agregar `@dnd-kit` ni `react-beautiful-dnd` — usar **Pointer Events API nativo** (sin dependencias externas):

```ts
// En cada mesa del plano:
function onPointerDown(e: React.PointerEvent) {
  e.currentTarget.setPointerCapture(e.pointerId);
  startDrag({ tableId, startX: e.clientX, startY: e.clientY, origCol, origRow });
}
function onPointerMove(e: React.PointerEvent) {
  if (!dragging) return;
  const deltaCol = Math.round((e.clientX - dragStart.startX) / CELL_SIZE);
  const deltaRow = Math.round((e.clientY - dragStart.startY) / CELL_SIZE);
  setPreviewPosition({ col: origCol + deltaCol, row: origRow + deltaRow });
}
function onPointerUp() {
  commitDrag(previewPosition);
  stopDrag();
}
```

La posición de preview se muestra en tiempo real con `position: absolute` sobre el grid. Al soltar, se actualiza el estado local. El layout no se persiste hasta que el usuario presiona "Guardar Layout".

**Visualización de mesas:**
- `shape === "cuadrada"` → `border-radius: 8px`
- `shape === "rectangle"` → igual pero `colSpan > rowSpan`
- `shape === "circle"` → `border-radius: 50%`
- Fondo: color según sección (mapeado a paleta fija de 6 colores de Tailwind).
- Contenido: label + icono de personas + capacidad.
- Mesa seleccionada: borde `#8B2500` + sombra.

**Controles del plano:**
- Botón "Guardar Layout" — llama `saveTableLayoutAction` con las posiciones actuales.
- Botón "Imprimir QRs" — abre `/api/admin/tables/qr-sheet` en pestaña nueva.
- Selector de sección para filtrar visibilidad.
- Zoom: botones +/- que ajustan `scale` de 0.5x a 1.5x.

#### 5.2.2 — Panel de listado y CRUD

Lista de todas las mesas agrupadas por sección. Cada fila muestra:
- Label + forma (icono) + capacidad.
- Badge de sección.
- Estado activo/inactivo (toggle).
- Acciones: Editar | Descargar QR | Regenerar Token | Eliminar.

**Modal de creación/edición:**
Formulario con los campos: `label`, `section`, `capacity`, `shape`, `gridCol`, `gridRow`, `colSpan`, `rowSpan`. Validado con Valibot client-side antes de enviar al action.

**Previsualización de QR en modal:**
Al abrir "editar mesa" o "ver QR", mostrar el QR inline como `<img src="/api/admin/tables/[id]/qr">` con lazy loading. Botón de descarga que dispara el mismo endpoint con header `Content-Disposition: attachment`.

**Regenerar token:**
Diálogo de confirmación: "Esta acción invalida el QR anterior. Deberás imprimir y reemplazar el QR físico en la mesa." Si confirma → `regenerateTokenAction` → toast de éxito + actualizar preview del QR.

---

## PARTE 6 — SIDEBAR: AGREGAR ENLACE

En `src/components/admin/layout/Sidebar.tsx`, agregar al array `navItems`:

```ts
{ href: "/admin/tables", label: "Mesas", icon: LayoutGrid },
```

Importar `LayoutGrid` desde `lucide-react`.

---

## PARTE 7 — INTEGRACIÓN COMPLETA CON `WaiterOrderClient`

### 7.1 — Prop `prefilledTable`

Agregar al componente:
```ts
interface WaiterOrderClientProps {
  // ... props existentes
  prefilledTable?: string;
}
```

### 7.2 — Indicador visual de mesa pre-seleccionada

Cuando `prefilledTable` está presente (viene de QR/NFC scan), mostrar un badge verde en el campo de mesa:

```tsx
{prefilledTable && tableNumber === prefilledTable && (
  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
    ✓ Mesa identificada por QR
  </span>
)}
```

### 7.3 — Lista de mesas para autocompletar (opcional)

Si el waiter está escribiendo manualmente, mostrar un datalist con las mesas activas:

```tsx
<input list="mesas-list" ... />
<datalist id="mesas-list">
  {activeTables.map(t => <option key={t.id} value={t.label} />)}
</datalist>
```

Para esto, pasar `activeTables: { label: string }[]` como prop desde la page server component (ya hace `getActiveTables()`).

---

## PARTE 8 — ESTADO LOCAL DEL PLANO (ZUSTAND)

Crear `src/store/tableLayoutStore.ts` con Zustand **sin** `persist` (no queremos que el layout en edición persista entre sesiones):

```ts
import { create } from "zustand";

interface TablePosition {
  id: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
}

interface TableLayoutState {
  positions: Record<string, TablePosition>;
  isDirty: boolean; // hay cambios sin guardar
  setPositions: (tables: TablePosition[]) => void;
  updatePosition: (id: string, pos: Partial<TablePosition>) => void;
  resetDirty: () => void;
}
```

Este store se inicializa con los datos de la DB al montar `TableManagerClient` (vía `useEffect` + `setPositions(tables.map(t => ({id: t.id, gridCol: t.gridCol, ...})))`).

---

## PARTE 9 — INSTRUCCIONES DE CONFIGURACIÓN NFC (en `README` del feature)

Agregar `src/app/(admin)/admin/tables/README.md`:

```markdown
# Identificación de mesas por NFC

## Configuración de un tag NFC

1. Instalar una app de escritura NFC (ej. "NFC Tools" en Android).
2. Seleccionar el tag en blanco.
3. Añadir registro → Tipo: URL.
4. Pegar la URL del QR de la mesa: `https://[dominio]/m/[token]`.
5. Escribir al tag. El proceso tarda ~2 segundos.

## Dispositivos compatibles

- Android: todos los modelos con NFC habilitado (configuración del sistema).
- iPhone: XS / XR (2018) y posteriores. iOS 14+: lectura de URL NFC sin app.

## Ventaja operacional

El waiter acerca el teléfono al tag (~0.5s), el browser abre automáticamente
el formulario de pedido con la mesa pre-seleccionada. Sin necesidad de abrir
la cámara o escanear. Misma URL que el QR — sin cambios de código.

## Costo estimado

Tags NFC NTAG213 (168 bytes, suficiente para URL de 80 chars): ~$0.50–$1.50/unidad.
```

---

## PARTE 10 — CHECKLIST DE VERIFICACIÓN FINAL

- [ ] `pnpm db:generate` genera tabla `restaurant_tables` con constraint `UNIQUE(qr_token)`.
- [ ] `pnpm db:migrate` ejecuta sin errores.
- [ ] `pnpm add nanoid` y `pnpm add qrcode @types/qrcode` instalados.
- [ ] `pnpm typecheck` pasa sin errores.
- [ ] `pnpm test` pasa (tests existentes no rompen).
- [ ] `createTableAction` crea mesa con `qrToken` único generado automáticamente.
- [ ] `GET /m/[token]` redirige correctamente a `/waiter?table=[label]`.
- [ ] `GET /m/[token-invalido]` retorna 404.
- [ ] `GET /api/admin/tables/[id]/qr` sin sesión admin retorna 401.
- [ ] `GET /api/admin/tables/[id]/qr` con sesión admin retorna imagen PNG válida.
- [ ] `GET /api/admin/tables/qr-sheet` retorna HTML imprimible con todos los QRs.
- [ ] El plano del salón renderiza las mesas en las posiciones correctas del grid.
- [ ] Drag & drop con Pointer Events mueve mesas visualmente.
- [ ] "Guardar Layout" persiste posiciones en DB vía `saveTableLayoutAction`.
- [ ] "Regenerar Token" invalida el token anterior y genera uno nuevo.
- [ ] `WaiterOrderClient` recibe `prefilledTable` desde `searchParams` y pre-rellena el campo de mesa.
- [ ] Escanear el QR de una mesa abre `/waiter` con la mesa correcta pre-seleccionada.
- [ ] Sidebar muestra el enlace "Mesas" solo para usuarios `admin`.

---

## NOTAS ARQUITECTURALES

**¿Por qué CSS Grid nativo y no una librería de canvas (Konva, Fabric.js)?**
El plano de restaurante es una grilla regular — no requiere posicionamiento libre en píxeles. CSS Grid maneja colisiones, spanning y responsividad nativamente. Konva/Fabric añadirían ~200 KB de JS para un caso de uso que CSS resuelve en cero líneas adicionales.

**¿Por qué Pointer Events API y no @dnd-kit?**
`@dnd-kit` es excelente para listas sortables. Para drag sobre un grid de coordenadas (col, row), el control manual via `onPointerDown/Move/Up` es más directo: calcular `deltaCol = round(deltaX / CELL_SIZE)` es trivial y no necesita configurar sensores, modificadores ni estrategias de colisión.

**¿Por qué `qrToken` es inmutable?**
Si la mesa se renombra ("Mesa 4" → "Salón VIP"), el QR físico impreso no necesita reimprimirse. La redirección en `/m/[token]` siempre resolverá al nuevo label. Solo regenerar el token si el QR físico se compromete (alguien accede sin autorización).

**¿Por qué `nanoid` con alfabeto personalizado?**
El alfabeto `23456789abcdefghjkmnpqrstuvwxyz` (32 chars) elimina caracteres visualmente ambiguos (0/O, 1/l/I). Si el token se lee en voz alta o se escribe manualmente como fallback, no hay confusión.

**Capacidad del grid:**
20 columnas × 15 filas = 300 celdas. A 2×2 por mesa, caben 75 mesas. Más que suficiente para cualquier restaurante. Si se necesita más, escalar las constantes `GRID_COLS` y `GRID_ROWS`.
