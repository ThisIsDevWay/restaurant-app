# META-PROMPT: Refactorización de KitchenQueue (KDS)
**Stack:** Next.js 15 App Router · TypeScript strict · TanStack Query · Tailwind CSS (tokens custom)

---

## ROL Y OBJETIVO

Refactorizar `src/components/kitchen/KitchenQueue.tsx` (~430 líneas) en archivos cohesivos.
Prioridad crítica: **eliminar la duplicación masiva del bloque de contornos**, que actualmente es un IIFE
de ~70 líneas copiado verbatim entre la columna "Nuevos" y la columna "En preparación".

---

## FASE 0 — AUDITORÍA PREVIA (obligatoria)

Antes de crear cualquier archivo, mapea estas entidades:

```
TYPES         KitchenOrder (inline, ~40 líneas de interface)
CONSTANTS     ORDER_MODE_LABELS
HELPERS       timeSince(), getElapsedMinutes()
HOOKS         useClock() — candidato a extracción
              useQuery block — candidato a custom hook
DUPLICACIONES ① Bloque contornos IIFE — idéntico en pending Y cooking cards
              ② Bloque de items map — ~90% idéntico en pending Y cooking
              ③ Card header structure — ~75% idéntico
              ④ handleReprint button — idéntico
COLUMNS       pendingOrders JSX (~110 líneas)
              cookingOrders JSX (~110 líneas)
              readyOrders JSX (~30 líneas)
```

**Punto crítico del análisis:** el bloque `{(() => { ... })()}` que resuelve contornos finales
(substitutions, pureRemovals, fixedContornos) es **exactamente el mismo código** en ambas columnas.
Este es el mayor ahorro del refactor.

---

## FASE 1 — TYPES Y CONSTANTS

### `src/types/kitchen.types.ts`
```typescript
export interface KitchenOrderItem {
  id: string;
  name: string;
  includedNote?: string | null;
  selectedContorno: { id: string; name: string } | null;
  fixedContornos?: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    quantity?: number;
    substitutesComponentId?: string;
    substitutesComponentName?: string;
  }>;
  selectedBebidas?: Array<{ id: string; name: string; quantity?: number }>;
  removedComponents: Array<{ isRemoval: true; componentId: string; name: string }>;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  orderNumber: number;
  customerPhone: string;
  itemsSnapshot: KitchenOrderItem[];
  status: "paid" | "kitchen" | "delivered" | "whatsapp";
  paymentMethod: string;
  orderMode?: "on_site" | "take_away" | "delivery" | null;
  deliveryAddress?: string | null;
  tableNumber?: string | null;
  subtotalBsCents: number;
  createdAt: string;
}

export const ORDER_MODE_LABELS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = { ... }; // Mover desde el monolito sin cambios
```

---

## FASE 2 — HELPERS Y HOOKS

### `src/lib/kitchen-utils.ts`
```typescript
export function timeSince(dateStr: string): string { ... }
export function getElapsedMinutes(dateStr: string): number { ... }
```

### `src/hooks/useClock.ts`
```typescript
export function useClock(): Date {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}
```

### `src/hooks/useKitchenOrders.ts`
Encapsula el fetch + detección de pedidos nuevos:
```typescript
export function useKitchenOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: fetchKitchenOrders,   // mover aquí también
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { /* lógica de detección de nuevos — mover aquí sin cambios */ }, [orders]);

  return {
    orders,
    isLoading,
    newOrderIds,
    pendingOrders: orders.filter(o => o.status === "paid"),
    cookingOrders: orders.filter(o => o.status === "kitchen"),
    readyOrders:   orders.filter(o => o.status === "delivered"),
  };
}
```

---

## FASE 3 — COMPONENTE CRÍTICO: KitchenItemSnapshot

Este es el componente más importante del refactor. Elimina la duplicación del bloque de contornos.

### `src/components/kitchen/KitchenItemSnapshot.tsx`
```typescript
interface KitchenItemSnapshotProps {
  item: KitchenOrderItem;
  accentColor: "amber" | "info"; // "amber" para pending, "info" para cooking
}

export function KitchenItemSnapshot({ item, accentColor }: KitchenItemSnapshotProps) {
  // Aquí va TODO el JSX del `order.itemsSnapshot.map()` inner body:
  // - Cantidad badge (con color por accentColor)
  // - item.name
  // - includedNote block
  // - Contornos block (el IIFE extraído como función pura resolveContornos())
  // - selectedAdicionales block
  // - selectedBebidas block
}
```

Extrae la lógica del IIFE como función pura **fuera del componente**:
```typescript
interface ResolvedContornos {
  keptDefault: { id: string; name: string } | null;
  keptFixed: Array<{ id: string; name: string }>;
  substitutions: KitchenOrderItem["selectedAdicionales"];
  pureRemovals: KitchenOrderItem["removedComponents"];
  hasModifications: boolean;
  hasAnyContornos: boolean;
}

function resolveContornos(item: KitchenOrderItem): ResolvedContornos {
  const substitutions = item.selectedAdicionales?.filter(a => a.substitutesComponentId) ?? [];
  const hasModifications = (item.removedComponents?.length ?? 0) > 0 || substitutions.length > 0;
  const replacedComponentIds = new Set(substitutions.map(s => s.substitutesComponentId));
  const pureRemovals = item.removedComponents?.filter(r => !replacedComponentIds.has(r.componentId)) ?? [];
  const hasFixedContornos = (item.fixedContornos?.length ?? 0) > 0;

  return {
    keptDefault: (item.selectedContorno && !item.removedComponents?.some(r => r.componentId === item.selectedContorno?.id))
      ? item.selectedContorno : null,
    keptFixed: item.fixedContornos?.filter(fc => !item.removedComponents?.some(r => r.componentId === fc.id)) ?? [],
    substitutions,
    pureRemovals,
    hasModifications,
    hasAnyContornos: !!item.selectedContorno || hasFixedContornos,
  };
}
```

**Beneficio:** 140 líneas de JSX duplicado → 1 componente reutilizable.

---

## FASE 4 — KitchenOrderCard

### `src/components/kitchen/KitchenOrderCard.tsx`
Un único componente de card que maneja los tres estados via props:

```typescript
type CardVariant = "pending" | "cooking" | "ready";

interface KitchenOrderCardProps {
  order: KitchenOrder;
  variant: CardVariant;
  isNew?: boolean;           // solo pending
  onAction: (id: string) => void;  // "Tomar pedido" | "Entregado" | noop
  onReprint: (id: string) => void;
}

export function KitchenOrderCard({
  order, variant, isNew = false, onAction, onReprint,
}: KitchenOrderCardProps) {
  const elapsed = getElapsedMinutes(order.createdAt);
  const isUrgent = elapsed > (variant === "pending" ? 15 : 20);
  
  // Calcular border color según variant + urgency
  const borderClass = getBorderClass(variant, isNew, isUrgent);
  
  return (
    <div className={`flex flex-col rounded-2xl border-2 bg-white shadow-md ${borderClass}`}>
      <KitchenOrderCardHeader
        order={order}
        variant={variant}
        isNew={isNew}
        isUrgent={isUrgent}
        onReprint={onReprint}
      />
      {variant !== "ready" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {order.itemsSnapshot.map((item, idx) => (
            <KitchenItemSnapshot
              key={idx}
              item={item}
              accentColor={variant === "pending" ? "amber" : "info"}
            />
          ))}
        </div>
      )}
      {variant === "ready" && (
        <div className="px-4 py-3">
          <p className="text-sm text-text-muted">{order.itemsSnapshot.length} items</p>
        </div>
      )}
      {variant !== "ready" && (
        <KitchenOrderCardFooter variant={variant} onAction={() => onAction(order.id)} />
      )}
    </div>
  );
}
```

Sub-componentes internos del card (pueden vivir en el mismo archivo o separados si superan 60 líneas):
- `KitchenOrderCardHeader` — número, badges, timer, reprint button
- `KitchenOrderCardFooter` — CTA button (texto y color según variant)

---

## FASE 5 — KitchenColumn

### `src/components/kitchen/KitchenColumn.tsx`
Componente para cada columna del kanban:

```typescript
interface KitchenColumnProps {
  variant: "pending" | "cooking" | "ready";
  orders: KitchenOrder[];
  newOrderIds?: Set<string>;
  onAction: (id: string) => void;
  onReprint: (id: string) => void;
}

const COLUMN_CONFIG = {
  pending: { dot: "bg-amber animate-pulse", label: "Nuevos", labelColor: "text-amber" },
  cooking: { dot: "bg-info", label: "En preparación", labelColor: "text-info" },
  ready:   { dot: "bg-success", label: "Listos", labelColor: "text-success" },
} as const;

export function KitchenColumn({ variant, orders, newOrderIds, onAction, onReprint }: KitchenColumnProps) {
  if (orders.length === 0) return null;
  const config = COLUMN_CONFIG[variant];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${config.dot}`} />
        <h2 className={`text-sm font-bold uppercase tracking-wider ${config.labelColor}`}>
          {config.label} — {orders.length}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map(order => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            variant={variant}
            isNew={newOrderIds?.has(order.id)}
            onAction={onAction}
            onReprint={onReprint}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## FASE 6 — ENSAMBLAJE FINAL

### `KitchenQueue.tsx` final (objetivo: ≤ 80 líneas)
```typescript
export function KitchenQueue({ restaurantName, logoUrl }) {
  const { pendingOrders, cookingOrders, readyOrders, newOrderIds, isLoading } = useKitchenOrders();
  const currentTime = useClock();
  const timeStr = currentTime.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

  const handleAction = async (orderId: string, status: "kitchen" | "delivered") => {
    const result = await updateOrderStatusAction({ orderId, status });
    if (result?.serverError) throw new Error(result.serverError);
  };

  const handleReprint = async (orderId: string) => {
    const result = await reprintOrderAction({ orderId });
    if (result?.data?.success) toast.success("Impresión enviada");
    else toast.error("Error al enviar impresión");
  };

  if (isLoading) return <KitchenLoadingState />;

  return (
    <div className="min-h-screen bg-bg-app">
      <KitchenHeader
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        timeStr={timeStr}
        pendingCount={pendingOrders.length}
        cookingCount={cookingOrders.length}
        readyCount={readyOrders.length}
      />
      <div className="p-4 sm:p-6">
        <KitchenColumn variant="pending" orders={pendingOrders} newOrderIds={newOrderIds}
          onAction={id => handleAction(id, "kitchen")} onReprint={handleReprint} />
        <KitchenColumn variant="cooking" orders={cookingOrders}
          onAction={id => handleAction(id, "delivered")} onReprint={handleReprint} />
        <KitchenColumn variant="ready" orders={readyOrders}
          onAction={() => {}} onReprint={handleReprint} />
        {pendingOrders.length + cookingOrders.length + readyOrders.length === 0 && (
          <KitchenEmptyState timeStr={timeStr} />
        )}
      </div>
    </div>
  );
}
```

---

## ESTRUCTURA FINAL

```
src/
├── types/
│   └── kitchen.types.ts            ← KitchenOrder, KitchenOrderItem, ORDER_MODE_LABELS
├── lib/
│   └── kitchen-utils.ts            ← timeSince(), getElapsedMinutes()
├── hooks/
│   ├── useClock.ts                 ← (reutilizable en otros componentes)
│   └── useKitchenOrders.ts         ← query + newOrderIds detection
└── components/kitchen/
    ├── KitchenQueue.tsx            ← Orquestador (~80 líneas)
    ├── KitchenHeader.tsx           ← header sticky con logo/reloj/stats
    ├── KitchenColumn.tsx           ← columna kanban genérica
    ├── KitchenOrderCard.tsx        ← card con variant="pending|cooking|ready"
    ├── KitchenItemSnapshot.tsx     ← 1 item del pedido (contornos logic aquí)
    └── KitchenEmptyState.tsx       ← estado vacío
```

---

## REGLAS DE EJECUCIÓN

### ✅ DEBES:
1. Extraer `resolveContornos()` como función **pura** (sin JSX) — facilita tests futuros.
2. Usar el patrón `variant` en `KitchenOrderCard` para colapsar las dos columnas duplicadas en una.
3. El `accentColor` prop en `KitchenItemSnapshot` debe ser un token válido del DS: `"amber" | "info"`, nunca un color hardcodeado.
4. Preservar el comportamiento de animación `animate-pulse-subtle` en cards nuevos.
5. `useClock` debe ser genérico — no importar nada de kitchen dentro de él.

### ❌ NO DEBES:
1. Cambiar el intervalo de `refetchInterval` (15000ms) o `staleTime` (10000ms).
2. Modificar los umbrales de urgencia (15 min pending, 20 min cooking).
3. Alterar los tokens Tailwind del DS (`text-amber`, `text-info`, `text-success`, `text-error`, `bg-primary`).
4. Crear un `KitchenOrderCard` separado para cada status — el prop `variant` es la solución correcta.

### ORDEN DE EXTRACCIÓN:
```
1. kitchen.types.ts         (base de todo)
2. kitchen-utils.ts         (sin dependencias)
3. useClock.ts              (sin dependencias de kitchen)
4. useKitchenOrders.ts      (depende de kitchen.types)
5. resolveContornos()       (función pura, sin JSX, va en kitchen-utils.ts)
6. KitchenItemSnapshot.tsx  (depende de tipos + resolveContornos)
7. KitchenOrderCard.tsx     (depende de KitchenItemSnapshot)
8. KitchenColumn.tsx        (depende de KitchenOrderCard)
9. KitchenHeader.tsx        (independiente)
10. KitchenEmptyState.tsx   (independiente)
11. KitchenQueue.tsx        (ensamblaje final)
```

---

## VERIFICACIÓN POST-REFACTOR

```
✓ ¿El bloque de contornos aparece exactamente UNA vez en el codebase?
✓ ¿resolveContornos() retorna datos, no JSX?
✓ ¿KitchenOrderCard funciona igual para pending, cooking y ready sin código condicional masivo?
✓ ¿useKitchenOrders retorna los 3 arrays filtrados y newOrderIds?
✓ ¿Los umbrales de urgencia (15/20 min) están en un solo lugar?
✓ ¿useClock es importable desde otros módulos sin dependencies de kitchen?
```
