# META-PROMPT: Refactorización de Monolitos — Salón / Mesero
**Stack:** Next.js 15 App Router · TypeScript strict · shadcn/ui · Zustand · Heritage Editorial DS

---

## ROL Y OBJETIVO

Eres un ingeniero senior de frontend especializado en arquitectura React. Tu misión es refactorizar dos archivos monolíticos en una estructura de archivos cohesiva, manteniendo **comportamiento idéntico al 100%**, **cero breaking changes** y **fidelidad absoluta al diseño Heritage Editorial**.

Los dos archivos fuente son:
- `src/components/admin/TableManagerClient.tsx` (~950 líneas)
- `src/components/waiter/WaiterOrderClient.tsx` (~800 líneas)

---

## FASE 0 — AUDITORÍA PREVIA (OBLIGATORIA, no saltar)

Antes de mover una sola línea de código, ejecuta este análisis y escribe el resultado como comentario interno:

### 0.1 Inventario de entidades

Para cada archivo, lista:
```
CONSTANTS    → nombre, valor, ¿duplicado en el otro archivo?
TYPES        → interfaces/types, ¿compartido?
HELPERS      → funciones puras, ¿duplicado?
SUB-COMP     → componentes React locales
HOOKS INLINE → bloques useState/useEffect/useCallback que merecen su propio hook
MAIN COMP    → responsabilidades del componente raíz
MODALS       → diálogos embebidos dentro del componente raíz
```

### 0.2 Detección de duplicados cross-file

Identifica explícitamente qué existe en AMBOS archivos actualmente:
- `CELL_SIZE = 44`
- `SECTION_PALETTE` (objeto de paleta por sección)
- `paletteFor()` (función helper)
- `FixtureIcon` (componente)
- Potenciales otros…

### 0.3 Mapa de dependencias

Para cada entidad, anota qué importa y qué la importa. Esto determina el orden de extracción.

---

## FASE 1 — SHARED PRIMITIVES (extraer primero)

Crea los siguientes archivos de código compartido. **No elimines nada de los monolitos todavía** — solo crea los archivos nuevos.

### `src/lib/salon-constants.ts`
```typescript
// Exporta:
export const CELL_SIZE = 44;
export const DRAG_THRESHOLD_PX = 4;
export const SECTIONS = [...] as const;
export type Section = typeof SECTIONS[number];
export const SECTION_PALETTE = { ... };
export function paletteFor(section: string | null | undefined) { ... }
```

**Regla:** Todo valor que aparezca en más de un archivo va aquí.

### `src/lib/salon-types.ts`
```typescript
// Exporta todos los tipos de dominio del salón:
export type TableShape = "cuadrada" | "rectangular" | "circular";
export type TableRotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export type EditingTable = Partial<RestaurantTable> & { shape?: TableShape; rotation?: TableRotation };
export interface DragState { ... }
```

**Regla:** Ningún tipo de dominio vive inline en un componente.

---

## FASE 2 — SHARED UI COMPONENTS

Crea componentes reutilizables usados en ambos archivos (o candidatos obvios a serlo).

### `src/components/salon/SalonSharedUI.tsx`
```typescript
"use client";
// Exporta como named exports (NO default):
export function FixtureIcon({ type, size, color }: ...) { ... }
export function SectionDot({ section }: ...) { ... }
export function ShapeIcon({ shape, size }: ...) { ... }
export function StatPill({ label, value }: ...) { ... }
```

**Regla:** Cada componente tiene sus propias props tipadas. No aceptes `any`.

---

## FASE 3 — CUSTOM HOOKS (extraer lógica con estado)

Cada hook encapsula una responsabilidad de estado. Deben ser **puros y testeables**.

### `src/hooks/useSalonDrag.ts`
Encapsula todo el sistema de drag & drop del `TableManagerClient`:
```typescript
export function useSalonDrag(params: {
  positions: PositionMap;
  fixturePositions: FixturePositionMap;
  zoom: number;
  gridCols: number;
  gridRows: number;
  editMode: "tables" | "space";
  floorRef: RefObject<HTMLDivElement>;
  updatePosition: (id: string, p: Partial<Position>) => void;
  updateFixturePosition: (id: string, p: Partial<FixturePosition>) => void;
}) {
  // Retorna:
  return {
    draggingId,         // string | null
    resizingId,         // string | null
    startDrag,          // (e, id) => void
    startFixtureDrag,   // (e, id) => void
    startFixtureResize, // (e, id) => void
    onFloorPointerMove, // ReactPointerEvent handler
    onFloorPointerUp,   // ReactPointerEvent handler
  };
}
```

**Regla:** El hook no accede a ningún DOM directamente — recibe `floorRef` como parámetro.

### `src/hooks/useZoomPersist.ts`
Encapsula zoom state + debounced save to settings:
```typescript
export function useZoomPersist(initialZoom: number) {
  // Retorna:
  return { zoom, handleZoomChange };
}
```

### `src/hooks/useTableCRUD.ts`
Encapsula los handlers `handleSaveTable`, `handleDelete`, `handleRegenToken`, `handleToggle`:
```typescript
export function useTableCRUD(params: {
  tables: RestaurantTable[];
  setTables: Dispatch<SetStateAction<RestaurantTable[]>>;
  positions: PositionMap;
  isDirty: boolean;
  resetDirty: () => void;
  setPositions: (p: Position[]) => void;
  setRotations: Dispatch<SetStateAction<Record<string, TableRotation>>>;
  gridCols: number;
  gridRows: number;
}) {
  return {
    openCreate,
    openEdit,
    rotateTable,
    handleSaveTable,
    handleDelete,
    handleRegenToken,
    handleToggle,
    // modal state:
    isModalOpen, setIsModalOpen,
    editingTable, setEditingTable,
    confirmDelete, setConfirmDelete,
    confirmRegen, setConfirmRegen,
    qrPreviewId, setQrPreviewId,
  };
}
```

### `src/hooks/useFixtureCRUD.ts`
Análogo al anterior pero para fixtures:
```typescript
export function useFixtureCRUD(params: { ... }) {
  return {
    handleDeleteFixture,
    selectedFixtureId, setSelectedFixtureId,
  };
}
```

### `src/hooks/useListReorder.ts`
Encapsula el drag-and-drop de la lista lateral (HTML5 DnD, no pointer events):
```typescript
export function useListReorder(params: {
  visibleTables: RestaurantTable[];
  tables: RestaurantTable[];
  setTables: Dispatch<SetStateAction<RestaurantTable[]>>;
}) {
  return {
    draggedIdx, dragOverIdx,
    handleListDragStart, handleListDragOver,
    handleListDragEnd, handleListDrop,
  };
}
```

---

## FASE 4 — MODALES COMO COMPONENTES STANDALONE

Extrae cada `<Dialog>` del `TableManagerClient` a su propio archivo.

### `src/components/admin/modals/TableFormModal.tsx`
Props: `{ isOpen, onClose, editingTable, setEditingTable, onSubmit, tables, gridCols, gridRows }`
Contenido: el `<Dialog>` de crear/editar mesa completo.

### `src/components/admin/modals/QrPreviewModal.tsx`
Props: `{ tableId, tableName, onClose, onRegen }`
Contenido: el `<Dialog>` de preview QR.

### `src/components/admin/modals/ConfirmDeleteModal.tsx`
Props: `{ tableLabel, onConfirm, onCancel }`
Contenido: el `<Dialog>` de confirmación de borrado.

### `src/components/admin/modals/ConfirmRegenModal.tsx`
Props: `{ tableLabel, onConfirm, onCancel }`
Contenido: el `<Dialog>` de regenerar token.

---

## FASE 5 — PANELES Y SECCIONES DEL TableManagerClient

Divide el JSX del componente raíz en sub-componentes de layout.

### `src/components/admin/TableManagerHeader.tsx`
Props mínimas para el header del `TableManagerClient`:
```typescript
interface TableManagerHeaderProps {
  editMode: "tables" | "space";
  setEditMode: (m: "tables" | "space") => void;
  isDirty: boolean;
  fixtureIsDirty: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  gridCols: number;
  gridRows: number;
  setGridSize: (cols: number, rows: number) => void;
  activeTables: RestaurantTable[];
  sections: string[];
  tables: RestaurantTable[];
  isSavingLayout: boolean;
  onSaveLayout: () => void;
}
```

### `src/components/admin/FloorCanvas.tsx`
El `<div ref={floorRef}>` con toda la renderización de fixtures y tables:
```typescript
interface FloorCanvasProps {
  tables: RestaurantTable[];
  fixtures: FloorFixture[];
  positions: PositionMap;
  fixturePositions: FixturePositionMap;
  rotations: Record<string, TableRotation>;
  zoom: number;
  gridCols: number;
  gridRows: number;
  activeSection: string;
  selectedId: string | null;
  selectedFixtureId: string | null;
  editMode: "tables" | "space";
  draggingId: string | null;
  // drag handlers:
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onTablePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onTableClick: (id: string) => void;
  onTableRotate: (id: string) => void;
  onFixturePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onFixtureClick: (id: string) => void;
  onFixtureDelete: (id: string) => void;
  onFixtureResize: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onFixtureLabelChange: (id: string, label: string | null) => void;
  onFixtureRotate: (id: string) => void;
  floorRef: RefObject<HTMLDivElement>;
}
```

### `src/components/admin/TableSidePanel.tsx`
El `<aside>` derecho en modo "tables": lista de mesas + QR detail + templates de arrastre.

### `src/components/admin/FixtureCatalogPanel.tsx`
El `<aside>` derecho en modo "space": catálogo de fixtures con drag.

---

## FASE 6 — SUB-COMPONENTES DEL WaiterOrderClient

### `src/components/waiter/CartLineItem.tsx`
El componente `CartLineItem` ya existe inline — extraerlo como archivo standalone.
Props tipadas, sin cambios de comportamiento.

### `src/components/waiter/OrderForm.tsx`
El componente `OrderForm` ya existe inline — extraerlo.

### `src/components/waiter/ActiveOrdersSheet.tsx`
El componente `ActiveOrdersSheet` ya existe al pie del archivo — moverlo a su propio archivo.

### `src/components/waiter/TableSelectorModal.tsx`
El modal de selección visual de mesa (incluyendo el floor plan de solo-lectura):
```typescript
interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  fixtures: FloorFixture[];
  gridCols: number;
  gridRows: number;
  layoutZoom: number;
  onSelectTable: (label: string) => void;
}
```

### `src/components/waiter/MenuItemGrid.tsx`
El grid de items de menú con search + category filter:
```typescript
interface MenuItemGridProps {
  items: MenuItemWithComponents[];
  categories: Category[];
  rate: number;
  settings: Record<string, unknown> | null;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  cartItems: CartItem[];
  onItemPress: (item: MenuItemWithComponents) => void;
}
```

---

## FASE 7 — ENSAMBLAJE FINAL DE LOS COMPONENTES RAÍZ

Una vez extraídas todas las piezas, los componentes raíz quedan como **orquestadores delgados**:

### `TableManagerClient.tsx` final (objetivo: ≤ 200 líneas)
```typescript
export function TableManagerClient({ initialTables, initialFixtures, initialSettings }) {
  // 1. Zustand stores
  const { positions, isDirty, ... } = useTableLayoutStore();
  const { positions: fixturePositions, ... } = useFixtureLayoutStore();
  
  // 2. Custom hooks
  const { zoom, handleZoomChange } = useZoomPersist(...);
  const drag = useSalonDrag({ positions, fixturePositions, zoom, ..., floorRef });
  const crud = useTableCRUD({ tables, setTables, positions, ... });
  const fixtureCRUD = useFixtureCRUD({ fixtures, setFixtures, ... });
  const reorder = useListReorder({ visibleTables, tables, setTables });
  
  // 3. Sync effects (solo estos)
  useEffect(() => { /* sync from server */ }, [initialTables]);
  useEffect(() => { /* keyboard zoom */ }, []);
  
  // 4. JSX: solo composición de sub-componentes
  return (
    <div>
      <TableManagerHeader ... />
      <div className="flex">
        <FloorCanvas ref={floorRef} ... />
        {editMode === "tables"
          ? <TableSidePanel ... />
          : <FixtureCatalogPanel ... />}
      </div>
      <TableFormModal ... />
      <QrPreviewModal ... />
      <ConfirmDeleteModal ... />
      <ConfirmRegenModal ... />
    </div>
  );
}
```

### `WaiterOrderClient.tsx` final (objetivo: ≤ 150 líneas)
```typescript
export function WaiterOrderClient({ items, categories, ..., tables, fixtures }) {
  // Solo estado de coordinación de alto nivel:
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [tableNumber, setTableNumber] = useState(prefilledTable ?? "");
  // ... etc
  
  return (
    <div>
      <WaiterHeader ... />
      <div className="flex">
        <MenuItemGrid ... />
        <aside className="hidden lg:flex ...">
          <CartLineItems ... />
          <OrderForm ... />
        </aside>
      </div>
      {/* Mobile sheet */}
      {/* Modals */}
      <ItemDetailModalModern ... />
      <ActiveOrdersSheet ... />
      <TableSelectorModal ... />
    </div>
  );
}
```

---

## ESTRUCTURA DE ARCHIVOS FINAL ESPERADA

```
src/
├── lib/
│   ├── salon-constants.ts          ← CELL_SIZE, SECTIONS, SECTION_PALETTE, paletteFor
│   └── salon-types.ts              ← TableShape, TableRotation, EditingTable, DragState
│
├── hooks/
│   ├── useSalonDrag.ts
│   ├── useZoomPersist.ts
│   ├── useTableCRUD.ts
│   ├── useFixtureCRUD.ts
│   └── useListReorder.ts
│
├── components/
│   ├── salon/
│   │   └── SalonSharedUI.tsx       ← FixtureIcon, SectionDot, ShapeIcon, StatPill
│   │
│   ├── admin/
│   │   ├── TableManagerClient.tsx  ← Orquestador (~200 líneas)
│   │   ├── TableManagerHeader.tsx
│   │   ├── FloorCanvas.tsx
│   │   ├── TableSidePanel.tsx
│   │   ├── FixtureCatalogPanel.tsx
│   │   └── modals/
│   │       ├── TableFormModal.tsx
│   │       ├── QrPreviewModal.tsx
│   │       ├── ConfirmDeleteModal.tsx
│   │       └── ConfirmRegenModal.tsx
│   │
│   └── waiter/
│       ├── WaiterOrderClient.tsx   ← Orquestador (~150 líneas)
│       ├── MenuItemGrid.tsx
│       ├── CartLineItem.tsx
│       ├── OrderForm.tsx
│       ├── ActiveOrdersSheet.tsx
│       └── TableSelectorModal.tsx
```

---

## REGLAS DE EJECUCIÓN (NO NEGOCIABLES)

### ✅ DEBES:
1. **Leer el archivo completo** antes de empezar cualquier extracción. Nunca operes sobre fragmentos.
2. **Crear el archivo nuevo** → **verificar que compila** → **actualizar imports en el monolito** → **ejecutar siguiente extracción**. Una entidad a la vez.
3. Mantener **todos los comentarios** existentes en el código (los bloques `// ── ... ──` son parte del Heritage Editorial DS).
4. Usar **named exports** en todos los archivos de componentes. `default export` solo donde Next.js lo requiera explícitamente (páginas).
5. Preservar los **inline styles** exactos del Heritage Editorial (paleta `cream/ink/red`, `fontFamily: var(--font-epilogue, serif)`). Ningún color debe migrar a una clase Tailwind si actualmente es un style prop.
6. Al extraer un hook, verificar que sus dependencias del `useCallback`/`useEffect` sean correctas en el nuevo scope.
7. **Declarar las props interfaces** de cada componente con tipado estricto — sin `any` nuevo.

### ❌ NO DEBES:
1. Cambiar ningún comportamiento observable (drag, zoom, animaciones, toasts, modales).
2. Reemplazar `style={{ ... }}` por clases Tailwind a menos que la paleta sea idéntica y sea un caso trivial (paddings/margins únicamente).
3. Introducir nuevas dependencias npm.
4. Mover lógica entre archivos sin entender primero sus dependencias.
5. Hacer más de una extracción por respuesta/turno — **una entidad a la vez** para minimizar errores.
6. Crear un barrel `index.ts` hasta que TODAS las extracciones estén completas y verificadas.

---

## PROTOCOLO DE VERIFICACIÓN POR CADA EXTRACCIÓN

Después de cada archivo creado, responde este checklist antes de continuar:

```
✓ ¿El nuevo archivo compila sin errores TypeScript?
✓ ¿El monolito importa correctamente desde el nuevo path?
✓ ¿Todas las props tienen tipos explícitos (sin any)?
✓ ¿Los useCallback/useEffect tienen dependencias correctas?
✓ ¿Se preservaron los inline styles del Heritage Editorial?
✓ ¿El comportamiento visual/interactivo es idéntico al original?
```

Si algún punto falla, corrígelo antes de la siguiente extracción.

---

## ORDEN DE EJECUCIÓN RECOMENDADO

Sigue este orden exacto para respetar el grafo de dependencias:

```
1. salon-constants.ts          (no dependencias internas)
2. salon-types.ts              (depende de schema imports)
3. SalonSharedUI.tsx           (depende de salon-types, fixture-catalog)
4. useZoomPersist.ts           (no dependencias internas complejas)
5. useSalonDrag.ts             (depende de salon-types, salon-constants)
6. useListReorder.ts           (depende de schema types)
7. useFixtureCRUD.ts           (depende de actions, schema)
8. useTableCRUD.ts             (depende de actions, schema, salon-constants)
9. FixtureCatalogPanel.tsx     (depende de SalonSharedUI, fixture-catalog)
10. TableSidePanel.tsx         (depende de SalonSharedUI, salon-types)
11. FloorCanvas.tsx            (depende de SalonSharedUI, salon-types, salon-constants)
12. TableManagerHeader.tsx     (depende de salon-constants)
13. Modales (4 archivos)       (depende de salon-types, salon-constants, shadcn/ui)
14. TableManagerClient.tsx     (ensamblaje final — importa todo lo anterior)
15. CartLineItem.tsx           (depende de cartStore, money utils)
16. OrderForm.tsx              (autónomo, depende de formatBs/formatRef)
17. ActiveOrdersSheet.tsx      (depende de shadcn/ui Sheet)
18. TableSelectorModal.tsx     (depende de salon-constants, SalonSharedUI)
19. MenuItemGrid.tsx           (depende de ItemDetailModalModern, needsModal)
20. WaiterOrderClient.tsx      (ensamblaje final)
```

---

## CONTEXTO ADICIONAL

- **Heritage Editorial DS:** El sistema de diseño usa `--font-epilogue` para headings y `--font-jakarta` para body. Los colores primarios son `cream: #fff8f3`, `ink: #251a07`, `red: #bb0005`. **No alterar** ninguno de estos valores.
- **Zustand stores:** `useTableLayoutStore` y `useFixtureLayoutStore` son externos — no moverlos.
- **Server Actions:** Las funciones de `@/actions/*` no se tocan — solo se mueven los calls a los hooks.
- **`CATALOG_BY_TYPE` y `FIXTURE_CATALOG`:** Viven en `@/lib/fixture-catalog` — no mover, solo importar.
- **`isDirty`/`fixtureIsDirty`:** Estos flags de Zustand deben permanecer funcionales — son críticos para el botón "Guardar Layout".
