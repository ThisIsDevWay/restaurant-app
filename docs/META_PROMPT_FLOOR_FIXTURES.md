# META-PROMPT: Sistema de Fixtures del Plano del Salón

> **Audiencia:** Agente de IA con acceso completo al repositorio.
> **Contexto base:** El `TableManagerClient.tsx` y su infraestructura (schema `restaurant_tables`, queries, actions, store Zustand) ya están implementados. Este meta-prompt **extiende** ese trabajo sin romper nada existente.
> **Constantes heredadas:** `CELL_SIZE = 44`, `GRID_COLS = 20`, `GRID_ROWS = 14`, `DRAG_THRESHOLD_PX = 4`. No cambiarlas.
> **Design system:** Heritage Editorial — paleta `#bb0005` / `#fff8f3` / `#251a07`, tipografía Epilogue + Plus Jakarta Sans, sin dividers de 1px, superficies por capas tonales.

---

## OBJETIVO

Agregar una capa de **fixtures** (elementos estructurales fijos) al plano del salón para que el espacio sea legible espacialmente: puertas, ventanas, paredes, barra, columnas, baños, etc. El mesero debe poder decir "la Mesa 3 está junto a la puerta de entrada, a la derecha de la columna" mirando el plano.

El sistema funciona en **dos modos** mutuamente excluyentes: **Modo Mesas** (actual, drag de mesas) y **Modo Espacio** (nuevo, drag de fixtures). Un toggle en la toolbar cambia entre ellos.

---

## PARTE 1 — BASE DE DATOS

### 1.1 — Nueva tabla `src/db/schema/floor-fixtures.ts`

```ts
import {
  pgTable, uuid, text, integer, timestamp,
} from "drizzle-orm/pg-core";

export type FixtureType =
  | "wall_h"       // pared horizontal — span ancho, rowSpan=1
  | "wall_v"       // pared vertical   — colSpan=1, span alto
  | "door"         // puerta sencilla
  | "door_double"  // puerta doble
  | "window"       // ventana
  | "bar_counter"  // mostrador de barra
  | "kitchen_pass" // ventana de paso a cocina
  | "cashier"      // caja/POS
  | "column"       // columna estructural
  | "stairs"       // escaleras
  | "bathroom"     // baño genérico
  | "bathroom_m"   // baño masculino
  | "bathroom_f"   // baño femenino
  | "plant"        // planta decorativa
  | "divider"      // separador/biombo
  | "text_label";  // etiqueta de texto libre (zona, salida, etc.)

export const floorFixtures = pgTable("floor_fixtures", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().$type<FixtureType>(),
  label: text("label"),          // texto personalizable, opcional salvo text_label
  gridCol: integer("grid_col").notNull(),
  gridRow: integer("grid_row").notNull(),
  colSpan: integer("col_span").notNull().default(1),
  rowSpan: integer("row_span").notNull().default(1),
  rotation: integer("rotation").notNull().default(0), // 0 | 90 | 180 | 270 grados
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
});

export type FloorFixture = typeof floorFixtures.$inferSelect;
export type NewFloorFixture = typeof floorFixtures.$inferInsert;
```

### 1.2 — Exportar en `src/db/schema/index.ts`

```ts
export * from "./floor-fixtures";
```

### 1.3 — Migración

```bash
pnpm db:generate
pnpm db:migrate
```

Verificar que se cree la tabla `floor_fixtures`. No hay FKs con `restaurant_tables` — son capas independientes.

---

## PARTE 2 — QUERIES `src/db/queries/floor-fixtures.ts`

```ts
import { db } from "@/db";
import { floorFixtures, type FloorFixture, type NewFloorFixture } from "@/db/schema/floor-fixtures";
import { eq } from "drizzle-orm";

export async function getAllFixtures(): Promise<FloorFixture[]> {
  return db.query.floorFixtures.findMany();
}

export async function createFixture(data: Omit<NewFloorFixture, "id" | "createdAt" | "updatedAt">): Promise<FloorFixture> {
  const [fixture] = await db.insert(floorFixtures).values(data).returning();
  if (!fixture) throw new Error("Insert returned no rows");
  return fixture;
}

export async function updateFixture(id: string, data: Partial<NewFloorFixture>): Promise<FloorFixture> {
  const [fixture] = await db
    .update(floorFixtures)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(floorFixtures.id, id))
    .returning();
  if (!fixture) throw new Error(`Fixture ${id} not found`);
  return fixture;
}

export async function deleteFixture(id: string): Promise<void> {
  await db.delete(floorFixtures).where(eq(floorFixtures.id, id));
}

export async function upsertFixtureLayout(
  updates: Array<{ id: string; gridCol: number; gridRow: number; colSpan: number; rowSpan: number; rotation: number }>
): Promise<void> {
  if (updates.length === 0) return;
  await db.transaction(async (tx) => {
    await Promise.all(
      updates.map((u) =>
        tx.update(floorFixtures)
          .set({ gridCol: u.gridCol, gridRow: u.gridRow, colSpan: u.colSpan, rowSpan: u.rowSpan, rotation: u.rotation, updatedAt: new Date() })
          .where(eq(floorFixtures.id, u.id))
      )
    );
  });
}
```

---

## PARTE 3 — SERVER ACTIONS `src/actions/floor-fixtures.ts`

Todas con `authenticatedActionClient`, guard `role === "admin"`. Usar el mismo patrón que `src/actions/restaurant-tables.ts`.

### `createFixtureAction`

Schema Valibot:
```ts
v.object({
  type: v.picklist(["wall_h","wall_v","door","door_double","window","bar_counter",
    "kitchen_pass","cashier","column","stairs","bathroom","bathroom_m","bathroom_f",
    "plant","divider","text_label"]),
  label: v.optional(v.string()),
  gridCol: v.pipe(v.number(), v.integer(), v.minValue(1)),
  gridRow: v.pipe(v.number(), v.integer(), v.minValue(1)),
  colSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
  rowSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(14)),
  rotation: v.picklist([0, 90, 180, 270]),
})
```

Retorna `{ success: true, fixture }`. `revalidatePath("/admin/tables")`.

### `updateFixtureAction`

Schema: igual + `id: v.string()`. Retorna `{ success: true, fixture }`.

### `deleteFixtureAction`

Schema: `v.object({ id: v.string() })`. Retorna `{ success: true }`.

### `saveFixtureLayoutAction`

Schema:
```ts
v.object({
  updates: v.array(v.object({
    id: v.string(),
    gridCol: v.number(),
    gridRow: v.number(),
    colSpan: v.number(),
    rowSpan: v.number(),
    rotation: v.picklist([0, 90, 180, 270]),
  }))
})
```

Llama `upsertFixtureLayout`. Retorna `{ success: true }`. `revalidatePath("/admin/tables")`.

---

## PARTE 4 — STORE ZUSTAND `src/store/fixtureLayoutStore.ts`

Nuevo store, análogo a `tableLayoutStore` pero para fixtures. Añade también `rotation` al estado:

```ts
import { create } from "zustand";

interface FixturePosition {
  id: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
  rotation: number;
}

interface FixtureLayoutState {
  positions: Record<string, FixturePosition>;
  isDirty: boolean;
  setPositions: (fixtures: FixturePosition[]) => void;
  updatePosition: (id: string, patch: Partial<FixturePosition>) => void;
  removePosition: (id: string) => void;
  resetDirty: () => void;
}

export const useFixtureLayoutStore = create<FixtureLayoutState>((set) => ({
  positions: {},
  isDirty: false,
  setPositions: (fixtures) =>
    set({ positions: Object.fromEntries(fixtures.map((f) => [f.id, f])), isDirty: false }),
  updatePosition: (id, patch) =>
    set((s) => ({
      positions: { ...s.positions, [id]: { ...s.positions[id]!, ...patch } },
      isDirty: true,
    })),
  removePosition: (id) =>
    set((s) => {
      const next = { ...s.positions };
      delete next[id];
      return { positions: next, isDirty: true };
    }),
  resetDirty: () => set({ isDirty: false }),
}));
```

---

## PARTE 5 — BIBLIOTECA DE FIXTURES `src/lib/fixture-catalog.ts`

Este módulo define el catálogo visual de cada tipo de fixture. Es importado por el componente — no hay lógica de DB aquí.

```ts
import type { FixtureType } from "@/db/schema/floor-fixtures";

export interface FixtureCatalogEntry {
  type: FixtureType;
  label: string;            // nombre para mostrar en la paleta
  description: string;      // tooltip
  defaultColSpan: number;
  defaultRowSpan: number;
  bg: string;               // color de fondo del fixture en el plano
  border: string;
  textColor: string;
  icon: string;             // nombre del icono lucide (string, se importa dinámicamente)
  canRotate: boolean;
  isWall: boolean;          // renderiza como barra sólida sin icono
  isTransparent: boolean;   // text_label: sin fondo
}

export const FIXTURE_CATALOG: FixtureCatalogEntry[] = [
  // ── Estructura ───────────────────────────────────────────────────
  { type: "wall_h",       label: "Pared H",        description: "Pared horizontal",
    defaultColSpan: 4, defaultRowSpan: 1,
    bg: "#94a3b8", border: "#64748b", textColor: "#fff",
    icon: "Minus", canRotate: false, isWall: true, isTransparent: false },

  { type: "wall_v",       label: "Pared V",        description: "Pared vertical",
    defaultColSpan: 1, defaultRowSpan: 4,
    bg: "#94a3b8", border: "#64748b", textColor: "#fff",
    icon: "Minus", canRotate: false, isWall: true, isTransparent: false },

  { type: "column",       label: "Columna",        description: "Columna estructural",
    defaultColSpan: 1, defaultRowSpan: 1,
    bg: "#cbd5e1", border: "#94a3b8", textColor: "#334155",
    icon: "Circle", canRotate: false, isWall: false, isTransparent: false },

  // ── Accesos ──────────────────────────────────────────────────────
  { type: "door",         label: "Puerta",         description: "Puerta sencilla",
    defaultColSpan: 2, defaultRowSpan: 1,
    bg: "#fef9c3", border: "#ca8a04", textColor: "#713f12",
    icon: "DoorOpen", canRotate: true, isWall: false, isTransparent: false },

  { type: "door_double",  label: "Puerta Doble",   description: "Puerta doble",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#fef9c3", border: "#ca8a04", textColor: "#713f12",
    icon: "DoorOpen", canRotate: true, isWall: false, isTransparent: false },

  { type: "window",       label: "Ventana",        description: "Ventana exterior",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#e0f2fe", border: "#0284c7", textColor: "#0c4a6e",
    icon: "AppWindow", canRotate: true, isWall: false, isTransparent: false },

  // ── Mobiliario fijo ──────────────────────────────────────────────
  { type: "bar_counter",  label: "Barra",          description: "Mostrador de barra",
    defaultColSpan: 4, defaultRowSpan: 2,
    bg: "#fef3c7", border: "#d97706", textColor: "#78350f",
    icon: "GlassWater", canRotate: true, isWall: false, isTransparent: false },

  { type: "kitchen_pass", label: "Paso Cocina",    description: "Ventana de paso a cocina",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#fce7f3", border: "#db2777", textColor: "#831843",
    icon: "ChefHat", canRotate: true, isWall: false, isTransparent: false },

  { type: "cashier",      label: "Caja",           description: "Caja registradora / POS",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#f0fdf4", border: "#16a34a", textColor: "#14532d",
    icon: "CreditCard", canRotate: true, isWall: false, isTransparent: false },

  { type: "stairs",       label: "Escaleras",      description: "Escaleras",
    defaultColSpan: 3, defaultRowSpan: 3,
    bg: "#faf5ff", border: "#9333ea", textColor: "#581c87",
    icon: "ArrowUpDown", canRotate: false, isWall: false, isTransparent: false },

  // ── Sanitarios ───────────────────────────────────────────────────
  { type: "bathroom",     label: "Baño",           description: "Baño / Aseo",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#f0fdf4", border: "#6cc08a", textColor: "#14532d",
    icon: "Toilet", canRotate: false, isWall: false, isTransparent: false },

  { type: "bathroom_m",   label: "Baño ♂",         description: "Baño masculino",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#eff6ff", border: "#3b82f6", textColor: "#1e3a8a",
    icon: "User", canRotate: false, isWall: false, isTransparent: false },

  { type: "bathroom_f",   label: "Baño ♀",         description: "Baño femenino",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#fdf2f8", border: "#ec4899", textColor: "#831843",
    icon: "UserRound", canRotate: false, isWall: false, isTransparent: false },

  // ── Decorativo ───────────────────────────────────────────────────
  { type: "plant",        label: "Planta",         description: "Planta decorativa",
    defaultColSpan: 1, defaultRowSpan: 1,
    bg: "#f0fdf4", border: "#86efac", textColor: "#14532d",
    icon: "Leaf", canRotate: false, isWall: false, isTransparent: false },

  { type: "divider",      label: "Separador",      description: "Biombo / División",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#f8fafc", border: "#94a3b8", textColor: "#475569",
    icon: "SeparatorHorizontal", canRotate: true, isWall: false, isTransparent: false },

  { type: "text_label",   label: "Etiqueta",       description: "Texto libre en el plano",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "transparent", border: "transparent", textColor: "#64748b",
    icon: "Type", canRotate: false, isWall: false, isTransparent: true },
];

export const CATALOG_BY_TYPE = Object.fromEntries(
  FIXTURE_CATALOG.map((f) => [f.type, f])
) as Record<FixtureType, FixtureCatalogEntry>;
```

---

## PARTE 6 — MODIFICACIONES AL `TableManagerClient.tsx`

### 6.1 — Nuevas props

La server page `src/app/(admin)/admin/tables/page.tsx` ya llama `getAllTables()`. Agregar llamada a `getAllFixtures()` y pasar el resultado:

```ts
// En page.tsx
import { getAllFixtures } from "@/db/queries/floor-fixtures";

const [tables, fixtures] = await Promise.all([getAllTables(), getAllFixtures()]);

return <TableManagerClient initialTables={tables} initialFixtures={fixtures} />;
```

Actualizar la firma del componente:
```ts
import type { FloorFixture } from "@/db/schema/floor-fixtures";

export function TableManagerClient({
  initialTables,
  initialFixtures,
}: {
  initialTables: RestaurantTable[];
  initialFixtures: FloorFixture[];
})
```

### 6.2 — Nuevo estado de modo

Agregar cerca de los otros `useState`:

```ts
type EditMode = "tables" | "space";
const [editMode, setEditMode] = useState<EditMode>("tables");
const [fixtures, setFixtures] = useState<FloorFixture[]>(initialFixtures);
const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
const [fixtureIsSavingLayout, setFixtureIsSavingLayout] = useState(false);

const {
  positions: fixturePositions,
  isDirty: fixtureIsDirty,
  setPositions: setFixturePositions,
  updatePosition: updateFixturePosition,
  removePosition: removeFixturePosition,
  resetDirty: resetFixtureDirty,
} = useFixtureLayoutStore();
```

Agregar `useEffect` para inicializar posiciones de fixtures:

```ts
useEffect(() => {
  setFixturePositions(
    initialFixtures.map((f) => ({
      id: f.id,
      gridCol: f.gridCol,
      gridRow: f.gridRow,
      colSpan: f.colSpan,
      rowSpan: f.rowSpan,
      rotation: f.rotation,
    }))
  );
  setFixtures(initialFixtures);
}, [initialFixtures, setFixturePositions]);
```

Añadir el import del store y del catálogo:
```ts
import { useFixtureLayoutStore } from "@/store/fixtureLayoutStore";
import { FIXTURE_CATALOG, CATALOG_BY_TYPE } from "@/lib/fixture-catalog";
import {
  createFixtureAction,
  updateFixtureAction,
  deleteFixtureAction,
  saveFixtureLayoutAction,
} from "@/actions/floor-fixtures";
```

### 6.3 — Toggle de modo en la toolbar

En el header, **antes** del grupo de zoom, insertar:

```tsx
{/* Mode toggle */}
<div
  className="flex rounded-full p-1 gap-1"
  style={{ background: surfaceLow, border: `1px solid ${outlineVariant}` }}
>
  {(["tables", "space"] as const).map((mode) => {
    const active = editMode === mode;
    return (
      <button
        key={mode}
        onClick={() => {
          setEditMode(mode);
          setSelectedId(null);
          setSelectedFixtureId(null);
        }}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
        style={{
          background: active ? "#fff" : "transparent",
          color: active ? ink : "#9a7a5a",
          boxShadow: active ? "0 1px 4px rgba(37,26,7,0.10)" : "none",
        }}
      >
        {mode === "tables" ? <LayoutGrid size={13} /> : <Layers size={13} />}
        {mode === "tables" ? "Mesas" : "Espacio"}
      </button>
    );
  })}
</div>
```

Agregar `Layers` al import de lucide-react.

El botón "Guardar Layout" existente debe mostrar el estado correcto según el modo activo:

```tsx
{/* El botón de guardar muestra el dirty del modo activo */}
const activeIsDirty = editMode === "tables" ? isDirty : fixtureIsDirty;
const activeIsSaving = editMode === "tables" ? isSavingLayout : fixtureIsSavingLayout;

const handleSaveActiveLayout = async () => {
  if (editMode === "tables") {
    await handleSaveLayout(); // función existente
  } else {
    await handleSaveFixtureLayout(); // nueva función
  }
};
```

### 6.4 — Función `handleSaveFixtureLayout`

```ts
const handleSaveFixtureLayout = async () => {
  setFixtureIsSavingLayout(true);
  try {
    const updates = Object.values(fixturePositions);
    const result = await saveFixtureLayoutAction({ updates });
    if (result?.data?.success) {
      toast.success("Espacio guardado");
      resetFixtureDirty();
    } else {
      toast.error(result?.serverError ?? "Error al guardar");
    }
  } catch {
    toast.error("Error de conexión");
  } finally {
    setFixtureIsSavingLayout(false);
  }
};
```

### 6.5 — Drag de fixtures (ref separado)

Declarar un segundo `dragRef` para fixtures:

```ts
const fixtureDragRef = useRef<DragState | null>(null);

const onFixturePointerDown = useCallback(
  (e: ReactPointerEvent, id: string) => {
    if (editMode !== "space") return;
    const pos = fixturePositions[id];
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    fixtureDragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origCol: pos.gridCol,
      origRow: pos.gridRow,
      didMove: false,
    };
    setSelectedFixtureId(id);
  },
  [editMode, fixturePositions]
);

const onFixturePointerMove = useCallback(
  (e: ReactPointerEvent) => {
    const drag = fixtureDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.didMove && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.didMove = true;
    const pos = fixturePositions[drag.id];
    if (!pos) return;
    const effectiveCell = CELL_SIZE * zoom;
    const newCol = Math.max(1, Math.min(drag.origCol + Math.round(dx / effectiveCell), GRID_COLS - pos.colSpan + 1));
    const newRow = Math.max(1, Math.min(drag.origRow + Math.round(dy / effectiveCell), GRID_ROWS - pos.rowSpan + 1));
    if (newCol !== pos.gridCol || newRow !== pos.gridRow) {
      updateFixturePosition(drag.id, { gridCol: newCol, gridRow: newRow });
    }
  },
  [fixturePositions, zoom, updateFixturePosition]
);

const onFixturePointerUp = useCallback((e: ReactPointerEvent) => {
  const drag = fixtureDragRef.current;
  if (!drag) return;
  e.currentTarget.releasePointerCapture(e.pointerId);
  fixtureDragRef.current = null;
}, []);
```

### 6.6 — Render de fixtures en el canvas

Dentro del `div` del floor plan (el que tiene `ref={floorRef}`), **antes** de la lista de mesas, agregar la capa de fixtures. Los fixtures se renderizan siempre (en ambos modos), pero solo son interactivos en modo `"space"`:

```tsx
{/* ── Fixture layer — siempre visible, interactivo solo en modo space ── */}
{fixtures.map((fixture) => {
  const pos = fixturePositions[fixture.id] ?? fixture;
  const catalog = CATALOG_BY_TYPE[fixture.type as FixtureType];
  if (!catalog) return null;
  const isSelectedFixture = selectedFixtureId === fixture.id;
  const inSpaceMode = editMode === "space";

  return (
    <div
      key={fixture.id}
      onPointerDown={(e) => inSpaceMode && onFixturePointerDown(e, fixture.id)}
      onPointerMove={inSpaceMode ? onFixturePointerMove : undefined}
      onPointerUp={inSpaceMode ? onFixturePointerUp : undefined}
      onClick={() => inSpaceMode && setSelectedFixtureId((p) => p === fixture.id ? null : fixture.id)}
      className="absolute flex flex-col items-center justify-center select-none transition-[box-shadow] duration-150"
      style={{
        left: (pos.gridCol - 1) * CELL_SIZE + 1,
        top: (pos.gridRow - 1) * CELL_SIZE + 1,
        width: pos.colSpan * CELL_SIZE - 2,
        height: pos.rowSpan * CELL_SIZE - 2,
        background: catalog.isWall ? catalog.bg : catalog.isTransparent ? "transparent" : catalog.bg,
        border: catalog.isTransparent ? "none" : `1.5px solid ${isSelectedFixture ? "#bb0005" : catalog.border}`,
        borderRadius: catalog.isWall ? 3 : 8,
        cursor: inSpaceMode ? "grab" : "default",
        touchAction: "none",
        zIndex: catalog.isWall ? 0 : 1,
        transform: `rotate(${pos.rotation}deg)`,
        boxShadow: isSelectedFixture ? "0 0 0 2px #bb000530" : "none",
        // Paredes: sin contenido visible
        overflow: "hidden",
      }}
    >
      {!catalog.isWall && (
        <>
          {/* Icono: se renderiza desde el nombre — usar un componente switch */}
          <FixtureIcon type={fixture.type} size={Math.max(12, Math.min(pos.colSpan * 6, 24))} color={catalog.textColor} />
          {(fixture.label || catalog.isTransparent) && (
            <span
              className="mt-0.5 text-center font-semibold leading-tight px-1 truncate w-full text-center"
              style={{
                fontSize: Math.max(8, Math.min(pos.colSpan * 5, 13)),
                color: catalog.textColor,
                fontFamily: catalog.isTransparent
                  ? "var(--font-epilogue, serif)"
                  : "inherit",
              }}
            >
              {fixture.label ?? catalog.label}
            </span>
          )}
        </>
      )}
    </div>
  );
})}

{/* ── Table layer — siempre visible ── */}
{visibleTables.map((table) => { /* código existente sin cambios */ })}
```

### 6.7 — Componente `FixtureIcon`

Declarar como función fuera del componente principal (no inline):

```tsx
import {
  Minus, DoorOpen, AppWindow, GlassWater, ChefHat, CreditCard,
  ArrowUpDown, Toilet, User, UserRound, Leaf, SeparatorHorizontal,
  Type, Circle as CircleIcon,
} from "lucide-react";
import type { FixtureType } from "@/db/schema/floor-fixtures";

function FixtureIcon({ type, size, color }: { type: FixtureType; size: number; color: string }) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (type) {
    case "wall_h": case "wall_v": case "divider": return <Minus {...props} />;
    case "door": case "door_double": return <DoorOpen {...props} />;
    case "window":      return <AppWindow {...props} />;
    case "bar_counter": return <GlassWater {...props} />;
    case "kitchen_pass": return <ChefHat {...props} />;
    case "cashier":     return <CreditCard {...props} />;
    case "column":      return <CircleIcon {...props} />;
    case "stairs":      return <ArrowUpDown {...props} />;
    case "bathroom":    return <Toilet {...props} />;
    case "bathroom_m":  return <User {...props} />;
    case "bathroom_f":  return <UserRound {...props} />;
    case "plant":       return <Leaf {...props} />;
    case "text_label":  return <Type {...props} />;
    default:            return null;
  }
}
```

### 6.8 — Panel lateral en Modo Espacio

El panel lateral derecho muestra contenido diferente según el `editMode`:

**Cuando `editMode === "tables"`** → sin cambios (listado de mesas actual).

**Cuando `editMode === "space"`** → mostrar:

1. **Fixture seleccionado** (si hay `selectedFixtureId`): controles de rotación + botón eliminar + campo label.
2. **Paleta de fixtures**: grid de botones para agregar elementos al plano. Al hacer clic en un botón de la paleta, se crea el fixture en la posición `(1,1)` (esquina top-left) y se selecciona automáticamente para que el usuario lo mueva.

```tsx
{/* Panel lateral — Modo Espacio */}
{editMode === "space" && (
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="px-5 py-4 border-b" style={{ borderColor: outlineVariant }}>
      <h2 className="text-lg font-black" style={{ fontFamily: "var(--font-epilogue, serif)", color: ink }}>
        Elementos del Espacio
      </h2>
      <p className="text-xs mt-0.5" style={{ color: "#9a7a5a" }}>
        Haz clic para agregar · Arrastra para posicionar
      </p>
    </div>

    {/* Selected fixture controls */}
    {selectedFixtureId && (() => {
      const selectedFixture = fixtures.find(f => f.id === selectedFixtureId);
      const pos = selectedFixtureId ? fixturePositions[selectedFixtureId] : null;
      const catalog = selectedFixture ? CATALOG_BY_TYPE[selectedFixture.type as FixtureType] : null;
      if (!selectedFixture || !pos || !catalog) return null;
      return (
        <div className="px-5 py-4 border-b" style={{ borderColor: outlineVariant, background: surfaceLow }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm" style={{ color: ink }}>
              {catalog.label}
            </span>
            <button
              onClick={async () => {
                if (!confirm("¿Eliminar este elemento?")) return;
                try {
                  const result = await deleteFixtureAction({ id: selectedFixture.id });
                  if (result?.data?.success) {
                    setFixtures(p => p.filter(f => f.id !== selectedFixture.id));
                    removeFixturePosition(selectedFixture.id);
                    setSelectedFixtureId(null);
                    toast.success("Elemento eliminado");
                  }
                } catch { toast.error("Error al eliminar"); }
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold"
              style={{ background: "#fff1f2", color: "#be123c" }}
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>

          {/* Label input */}
          <div className="mb-3">
            <Label className="text-[10px] uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
              Etiqueta
            </Label>
            <Input
              value={selectedFixture.label ?? ""}
              onChange={async (e) => {
                const newLabel = e.target.value;
                setFixtures(p => p.map(f => f.id === selectedFixture.id ? { ...f, label: newLabel } : f));
                try {
                  await updateFixtureAction({ id: selectedFixture.id, label: newLabel });
                } catch { /* silencioso */ }
              }}
              placeholder={catalog.label}
              className="mt-1 h-8 rounded-lg text-sm"
            />
          </div>

          {/* Rotation — solo si canRotate */}
          {catalog.canRotate && (
            <div>
              <Label className="text-[10px] uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                Rotación
              </Label>
              <div className="flex gap-1.5 mt-1">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    onClick={() => {
                      updateFixturePosition(selectedFixtureId, { rotation: deg });
                    }}
                    className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background: pos.rotation === deg ? ink : surfaceLow,
                      color: pos.rotation === deg ? "#fff" : ink,
                      border: `1px solid ${outlineVariant}`,
                    }}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    })()}

    {/* Palette grid */}
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9a7a5a" }}>
        Agregar elemento
      </p>
      <div className="grid grid-cols-3 gap-2">
        {FIXTURE_CATALOG.map((entry) => (
          <button
            key={entry.type}
            title={entry.description}
            onClick={async () => {
              try {
                const result = await createFixtureAction({
                  type: entry.type,
                  label: null,
                  gridCol: 1,
                  gridRow: 1,
                  colSpan: entry.defaultColSpan,
                  rowSpan: entry.defaultRowSpan,
                  rotation: 0,
                });
                if (result?.data?.success) {
                  const created = result.data.fixture as FloorFixture;
                  setFixtures(p => [...p, created]);
                  setFixturePositions([
                    ...Object.values(fixturePositions),
                    { id: created.id, gridCol: 1, gridRow: 1,
                      colSpan: created.colSpan, rowSpan: created.rowSpan, rotation: 0 },
                  ]);
                  setSelectedFixtureId(created.id);
                  toast.success(`${entry.label} agregado — arrástralo a su posición`);
                }
              } catch { toast.error("Error al crear elemento"); }
            }}
            className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: entry.bg === "transparent" ? surfaceLow : entry.bg,
              border: `1.5px solid ${entry.border === "transparent" ? outlineVariant : entry.border}`,
              color: entry.textColor,
            }}
          >
            <FixtureIcon type={entry.type} size={18} color={entry.textColor} />
            <span className="leading-tight text-center">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## PARTE 7 — INTERACTIVIDAD DE MESAS EN MODO ESPACIO

Cuando `editMode === "space"`, las mesas del plano deben ser visibles pero **no interactivas** (sin drag, sin selección, sin hover). Modificar el bloque de render de cada mesa para condicionar los handlers:

```tsx
// En el map de visibleTables, cambiar los handlers condicionalmente:
onPointerDown={editMode === "tables" ? (e) => onPointerDown(e, table.id) : undefined}
onPointerMove={editMode === "tables" ? onPointerMove : undefined}
onPointerUp={editMode === "tables" ? onPointerUp : undefined}
onClick={editMode === "tables"
  ? () => setSelectedId((p) => p === table.id ? null : table.id)
  : undefined}
style={{
  // ...estilos existentes
  cursor: editMode === "tables" ? "grab" : "default",
  opacity: editMode === "space"
    ? (table.isActive ? 0.45 : 0.2)
    : (table.isActive ? 1 : 0.5),
}}
```

Del mismo modo, los fixtures en modo `"tables"` deben verse con opacidad reducida y cursor `default`.

---

## PARTE 8 — HINT DE MODO VISIBLE EN EL PLANO

Debajo de la barra de filtro de sección, mostrar un banner contextual según el modo:

```tsx
{editMode === "space" && (
  <div
    className="shrink-0 flex items-center gap-2 px-6 py-2 text-xs font-semibold"
    style={{ background: "#fef3c7", color: "#713f12", borderBottom: `1px solid #fde68a` }}
  >
    <Layers size={13} />
    Modo Espacio — Clic en la paleta para agregar · Arrastra para posicionar · Las mesas no son interactivas
  </div>
)}
{editMode === "tables" && (
  <div
    className="shrink-0 flex items-center gap-2 px-6 py-2 text-xs font-semibold"
    style={{ background: "#f0fdf4", color: "#14532d", borderBottom: `1px solid #bbf7d0` }}
  >
    <LayoutGrid size={13} />
    Modo Mesas — Arrastra para reposicionar · Los elementos del espacio son de referencia
  </div>
)}
```

---

## PARTE 9 — ACTUALIZAR PAGE SERVER COMPONENT

`src/app/(admin)/admin/tables/page.tsx`:

```ts
import { getAllTables } from "@/db/queries/restaurant-tables";
import { getAllFixtures } from "@/db/queries/floor-fixtures";
import { TableManagerClient } from "./TableManagerClient";
import { requireAdmin } from "@/lib/auth";

export default async function TablesPage() {
  await requireAdmin();
  const [tables, fixtures] = await Promise.all([
    getAllTables(),
    getAllFixtures(),
  ]);
  return (
    <div className="flex h-full flex-col">
      <TableManagerClient initialTables={tables} initialFixtures={fixtures} />
    </div>
  );
}
```

---

## PARTE 10 — CHECKLIST DE VERIFICACIÓN FINAL

- [ ] `pnpm db:generate` genera tabla `floor_fixtures`.
- [ ] `pnpm db:migrate` ejecuta sin errores.
- [ ] `pnpm typecheck` pasa sin errores.
- [ ] `pnpm test` pasa (tests existentes no rompen).
- [ ] El toggle Mesas / Espacio en la toolbar cambia de modo visualmente.
- [ ] En Modo Mesas: las mesas son draggables; los fixtures son visibles pero no seleccionables.
- [ ] En Modo Espacio: los fixtures son draggables; las mesas aparecen con opacidad reducida y no son seleccionables.
- [ ] Hacer clic en un botón de la paleta crea el fixture en `(1,1)` y lo selecciona automáticamente.
- [ ] Arrastrar un fixture recién creado lo reposiciona en el grid.
- [ ] El panel de fixture seleccionado muestra el campo label y los botones de rotación (si aplica).
- [ ] Cambiar la etiqueta de un fixture llama a `updateFixtureAction` inmediatamente.
- [ ] Los botones de rotación (0°/90°/180°/270°) actualizan visualmente el fixture en el plano.
- [ ] "Guardar Layout" en modo Espacio persiste posiciones y rotaciones con `saveFixtureLayoutAction`.
- [ ] "Guardar Layout" en modo Mesas funciona igual que antes con `saveTableLayoutAction`.
- [ ] El botón "Eliminar" en el panel de fixture seleccionado elimina el fixture de la DB y del plano.
- [ ] Las paredes (`wall_h`, `wall_v`) se renderizan como barras sólidas sin icono.
- [ ] Los `text_label` se renderizan sin fondo, con texto en fuente Epilogue.
- [ ] Al recargar la página, todos los fixtures aparecen en sus posiciones y rotaciones persistidas.
- [ ] El banner contextual del modo es visible y desaparece al cambiar de modo.

---

## NOTAS DE IMPLEMENTACIÓN

**¿Por qué dos layers separados y no un solo array unificado?**
Mesas y fixtures tienen ciclos de vida completamente distintos. Las mesas generan órdenes, tienen QR, secciones, capacidad, toggle activo/inactivo. Los fixtures son decoración estática. Mezclarlos en un solo array agregaría condiciones `if (isTable)` en cada operación — la separación es más limpia.

**¿Por qué `zIndex: 0` para paredes y `1` para el resto?**
Las paredes deben renderizarse debajo de todo lo demás para no bloquear la selección de mesas o fixtures superpuestos. Los fixtures decorativos van sobre las paredes pero bajo las mesas.

**Rotación via CSS `transform: rotate()`:**
La rotación es puramente visual — `gridCol/gridRow/colSpan/rowSpan` no cambian. Esto es correcto para puertas, ventanas y separadores (orientar el icono). Para paredes, la rotación no aplica porque el usuario usa `wall_h` vs `wall_v` con los spans correctos.

**`text_label` como zona:**
Permite al admin escribir "Zona Fumadores", "Salida de Emergencia", "Reservado" sobre el plano. `background: transparent`, `border: none` — solo texto flotante con fuente Epilogue bold que sirve como anotación del plano.

**Persistencia de rotación:**
La rotación se guarda en `saveFixtureLayoutAction` junto con las posiciones. El campo `rotation` en la tabla permite 0/90/180/270 — suficiente para los 8 elementos que usan rotación (`door`, `door_double`, `window`, `bar_counter`, `kitchen_pass`, `cashier`, `divider`).
