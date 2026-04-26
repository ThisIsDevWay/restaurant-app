# META-PROMPT: Sistema de Toma de Pedidos en Sala + Impresión Térmica Local

> **Audiencia:** Agente de IA con acceso completo al repositorio (lectura/escritura).
> **Stack confirmado:** Next.js 15.4, Drizzle ORM + PostgreSQL (Supabase), Auth.js v5, Zustand, TanStack Query, Valibot, Tailwind v4, shadcn/ui, pnpm.
> **App desplegada en:** Vercel (remoto).
> **Impresora local:** MR. TECNO Zy-Q821 — ESC/POS, USB, papel 79.5 mm ≈ 80 mm — conectada por USB al PC del local.

---

## CONTEXTO Y RESTRICCIONES CLAVE

La aplicación corre en Vercel. El PC del local tiene la impresora por USB. El agente de impresión (un proceso Node.js que corre en el PC local) se conecta **directamente a Supabase Realtime** — sin pasar por Vercel — y recibe notificación en < 100 ms cuando se inserta un `print_job`. Vercel no interviene en el flujo de impresión después de la inserción inicial en DB.

No hay número de teléfono de cliente real en pedidos de mesero. No hay flujo de pago online: el cobro es en caja (efectivo o punto de venta). El pedido debe aparecer en la cola de cocina (`/kitchen`) exactamente igual que un pedido normal en estado `"kitchen"`.

Nunca toques los archivos de migraciones existentes en `src/db/migrations/`. Genera siempre nuevas migraciones con `pnpm db:generate`.

---

## PARTE 1 — CAMBIOS DE BASE DE DATOS Y ESQUEMA

### 1.1 — Ampliar enum de roles en `src/db/schema/users.ts`

Línea actual:
```ts
role: text("role").notNull().$type<"admin" | "kitchen">(),
```
Cambiar a:
```ts
role: text("role").notNull().$type<"admin" | "kitchen" | "waiter">(),
```

### 1.2 — Agregar `table_number` a `src/db/schema/orders.ts`

Agregar la columna después de `deliveryAddress`:
```ts
tableNumber: text("table_number"),
```

Actualizar también el tipo del `itemsSnapshot` si es necesario para incluir `tableNumber` en la raíz del objeto order (no dentro del snapshot de items).

### 1.3 — Nueva tabla `print_jobs` en `src/db/schema/print-jobs.ts`

```ts
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const printJobs = pgTable("print_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  copies: integer("copies").notNull().default(2),
  status: text("status")
    .notNull()
    .$type<"pending" | "printing" | "done" | "error">()
    .default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
```

### 1.4 — Exportar la nueva tabla en `src/db/schema/index.ts`

```ts
export * from "./print-jobs";
```

### 1.5 — Migración

Ejecutar:
```bash
pnpm db:generate
pnpm db:migrate
```

Verificar que la migración incluya: columna `table_number` en `orders`, tabla `print_jobs`, y que `users.role` acepte el valor `'waiter'` (en Postgres es `text`, no enum, así que no requiere DDL extra; solo es una restricción TypeScript).

---

## PARTE 2 — AUTENTICACIÓN Y MIDDLEWARE

### 2.1 — Actualizar `src/types/next-auth.d.ts` (o donde esté la declaración de sesión)

Agregar `"waiter"` al tipo de `role` en la sesión de Auth.js para que TypeScript no falle.

### 2.2 — Actualizar `src/middleware.ts`

El middleware actual bloquea `/admin` a cualquiera que no sea `admin`. Los meseros tendrán su propia ruta `/waiter`, no `/admin`. Agregar la protección:

```ts
if (pathname.startsWith("/waiter")) {
  if (!isLoggedIn || !["admin", "waiter"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
```

Agregar `/waiter/:path*` al array `matcher`.

### 2.3 — Actualizar `src/lib/auth.ts`

En la función `requireKitchenOrAdmin` (o donde se valide el rol en layouts server-side), no es necesario cambiar nada porque `/waiter` tendrá su propio layout con su propia guard. Crear una función equivalente:

```ts
export async function requireWaiterOrAdmin() {
  const session = await auth();
  if (!session?.user || !["admin", "waiter"].includes(session.user.role ?? "")) {
    redirect("/login");
  }
  return session;
}
```

---

## PARTE 3 — RUTA `/waiter` Y PÁGINA DE TOMA DE PEDIDOS

### 3.1 — Layout `src/app/(waiter)/layout.tsx`

```ts
import { QueryProvider } from "@/providers/QueryProvider";
import { requireWaiterOrAdmin } from "@/lib/auth";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  await requireWaiterOrAdmin();
  return <QueryProvider>{children}</QueryProvider>;
}
```

### 3.2 — Página `src/app/(waiter)/waiter/page.tsx`

Página server component que obtiene los datos del menú del día y los pasa al componente cliente. Misma estrategia que `src/app/(public)/page.tsx`:

- Llamar a `getDailyMenuWithOptionsAndComponents(today)`
- Llamar a `getActiveRate()`
- Llamar a `getSettings()`
- Renderizar `<WaiterOrderClient ... />`

### 3.3 — Componente cliente `src/app/(waiter)/waiter/WaiterOrderClient.tsx`

Este es el componente principal. Sus responsabilidades:

**Panel izquierdo — Menú del día:**
- Mostrar los ítems del día agrupados por categoría (reutilizar la lógica de `MenuGrid` pero en versión simplificada).
- Cada ítem tiene un botón `+` que lo agrega al carrito.
- Al hacer clic en un ítem que tiene contornos/adicionales/bebidas, abrir un modal de personalización (puede reutilizar la lógica de `ItemDetailModalModern` o una versión simplificada).
- Mostrar precio en USD (es la vista operativa del mesero).

**Panel derecho — Resumen del pedido:**
- Lista de ítems en el carrito con cantidad, modificaciones y precio.
- Subtotal y total (en USD y Bs. usando la tasa activa).
- Campo: `tableNumber` — `<Input>` de texto, requerido, placeholder `"Mesa / N° de cliente"`.
- Campo: `paymentMethod` — `<Select>` con opciones `cash` (Efectivo) y `pos` (Punto de Venta). Valor por defecto: `cash`.
- Botón "Enviar Pedido" — dispara la Server Action.

**Estado:**
- Usar el `cartStore` de Zustand existente en `src/store/cartStore.ts`. El store ya maneja ítems, cantidades y modificaciones.
- Al enviar exitosamente, limpiar el carrito y mostrar toast de confirmación con el número de orden.

**Comportamiento crítico:**
- El botón de enviar debe estar deshabilitado si el carrito está vacío o si `tableNumber` está en blanco.
- Mostrar el total prominentemente antes del botón.
- El mesero NO ve pantallas de pago, QR, comprobantes ni timers de expiración.

### 3.4 — Reutilización del carrito

El `cartStore` de Zustand en `src/store/cartStore.ts` es compartido globalmente. Para la ruta `/waiter`, el store funciona igual que en el cliente público. Asegurarse de que el `CartProvider` (si existe) esté en el layout de `/waiter`.

---

## PARTE 4 — SERVER ACTION: `createWaiterOrderAction`

Crear `src/actions/waiter-order.ts`:

```ts
"use server";
import * as v from "valibot";
import { authenticatedActionClient } from "@/lib/safe-action";
import { calculateOrderTotals } from "@/services/order.service";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { createOrderWithCapacityCheck } from "@/db/queries/orders";
import { db } from "@/db";
import { printJobs } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { CheckoutItem } from "@/lib/types/checkout";

const waiterOrderSchema = v.object({
  tableNumber: v.pipe(v.string(), v.minLength(1, "Mesa requerida")),
  paymentMethod: v.picklist(["cash", "pos"]),
  items: v.any(), // CheckoutItem[] — validado en service
});

export const createWaiterOrderAction = authenticatedActionClient
  .schema(waiterOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Guard: solo admin o waiter
    if (!["admin", "waiter"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");

    const rateResult = await getActiveRate();
    if (!rateResult) throw new Error("Tasa de cambio no disponible");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
    }).format(new Date());

    const items = parsedInput.items as CheckoutItem[];

    const { snapshotItems, subtotalUsdCents, subtotalBsCents } =
      await calculateOrderTotals(items, rateResult.rate, today);

    const grandTotalUsdCents = subtotalUsdCents; // sin surcharges (on_site sin empaque)
    const grandTotalBsCents = subtotalBsCents;

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // expira en 8h (no relevante para pedidos de sala)

    const { order, reason } = await createOrderWithCapacityCheck(
      {
        customerPhone: `mesa-${parsedInput.tableNumber}`, // placeholder para cumplir NOT NULL
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        packagingUsdCents: 0,
        deliveryUsdCents: 0,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: null,
        status: "kitchen", // Va directo a cocina
        paymentMethod: parsedInput.paymentMethod,
        paymentProvider: "whatsapp_manual", // provider dummy; el pago es presencial
        orderMode: "on_site",
        tableNumber: parsedInput.tableNumber,
        deliveryAddress: null,
        gpsCoords: null,
        exchangeRateId: settings.currentRateId!,
        rateSnapshotBsPerUsd: rateResult.rate.toString(),
        expiresAt,
        checkoutToken: null,
      },
      999 // sin límite de capacidad para pedidos de mesero
    );

    if (reason === "capacity_exceeded") {
      throw new Error("Capacidad máxima alcanzada.");
    }
    if (!order) throw new Error("Error al crear la orden");

    // Crear trabajo de impresión
    await db.insert(printJobs).values({
      orderId: order.id,
      copies: 2,
      status: "pending",
    });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  });
```

**Notas de implementación:**
- `createOrderWithCapacityCheck` en `src/db/queries/orders.ts` necesita aceptar el campo `tableNumber` en su objeto de inserción. Actualizar la query para que incluya ese campo en el `db.insert(orders).values({...})`.
- El `paymentProvider` se pone `"whatsapp_manual"` como valor válido del enum. Si eso causa conflicto semántico, agregar `"in_person"` como nuevo valor al enum de `paymentProvider` en el schema.

---

## PARTE 5 — HABILITAR SUPABASE REALTIME EN `print_jobs`

No se crean endpoints API en Next.js para el flujo de impresión. El agente se comunica directamente con Supabase.

### 5.1 — Activar Realtime en la tabla

Ejecutar en el SQL Editor de Supabase (una sola vez):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
```

Sin esto, `postgres_changes` en el canal del agente no recibirá nada.

### 5.2 — RLS de la tabla `print_jobs`

La tabla no necesita estar expuesta al cliente del browser. El agente usa `SUPABASE_SERVICE_ROLE_KEY` que bypasea RLS. Asegurarse de que **no** haya políticas `SELECT` públicas en `print_jobs` — solo el service role debe poder leer/escribir.

---

## PARTE 6 — AGENTE DE IMPRESIÓN LOCAL (`print-agent/`)

Proyecto Node.js independiente en una subcarpeta `print-agent/` en la raíz del repo (excluida del build de Next). Se conecta directamente a Supabase — sin pasar por Vercel — vía WebSocket Realtime. El agente se ejecuta una vez en el PC del local y se deja corriendo.

### 6.1 — Estructura

```
print-agent/
  package.json
  .env
  index.mjs
  escpos-utils.mjs
  print-raw.ps1
  README.md
```

### 6.2 — `print-agent/package.json`

```json
{
  "name": "gm-print-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8",
    "escpos": "^3.0.0-alpha.6",
    "dotenv": "^16.4.5"
  }
}
```

Misma versión de `@supabase/supabase-js` que el proyecto principal para evitar discrepancias de protocolo.

### 6.3 — `print-agent/.env` (plantilla)

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Nombre exacto de la impresora tal como aparece en Panel de Control > Impresoras
# Verificar con: Get-Printer | Select-Object Name (PowerShell)
PRINTER_NAME=MR. TECNO Zy-Q821
```

`APP_URL` y `PRINT_AGENT_SECRET` eliminados — el agente ya no llama a Vercel.

**Nota:** `PRINTER_NAME` debe ser el nombre exacto (case-sensitive) que muestra Windows en "Dispositivos e impresoras". El driver existente (`usbprint.sys`) no se toca.

### 6.4 — `print-agent/escpos-utils.mjs`

Módulo que construye el buffer ESC/POS del ticket. Formato para papel de 80mm (42 chars por línea):

```
================================
    [NOMBRE RESTAURANTE]
================================
Pedido #[orderNumber]   Mesa: [tableNumber]
[fecha] [hora]
--------------------------------
[items]
  x[qty] [nombre]        $[precio]
    + [adicional]
    - [removido]
    ~ [bebida]
--------------------------------
SUBTOTAL:           $[X.XX]
TOTAL USD:          $[X.XX]
TOTAL Bs.:          Bs. [X.XX]
================================
Pago: [Efectivo / PdV]
================================
  ** [CONTROL / COCINA] **
================================

[3 saltos de línea + corte]
```

El módulo exporta `buildTicketCommands(job)` que retorna los comandos ESC/POS para imprimir una copia. El caller lo llama N veces según `job.copies`.

**ESC/POS commands a usar (sin librería si la librería falla):**
- Init: `\x1B\x40`
- Align center: `\x1B\x61\x01`
- Align left: `\x1B\x61\x00`
- Bold on: `\x1B\x45\x01`
- Bold off: `\x1B\x45\x00`
- Double height/width: `\x1D\x21\x11`
- Normal size: `\x1D\x21\x00`
- Line feed: `\x0A`
- Full cut: `\x1D\x56\x00`

Si `escpos` npm da problemas de compatibilidad con ESM o con Node 20+, construir el buffer manualmente con los comandos ESC/POS listados arriba usando `Buffer.concat([...])` y arrays de bytes.

### 6.5 — `print-agent/print-raw.ps1`

Script PowerShell que envía bytes crudos al spooler de Windows con datatype `RAW`. Esto permite coexistir con cualquier otro software que use la misma impresora: el spooler serializa todos los trabajos automáticamente.

```powershell
# print-raw.ps1
param([string]$PrinterName, [string]$FilePath)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [DllImport("winspool.drv", EntryPoint="OpenPrinterA")]
    public static extern bool OpenPrinter(string name, out IntPtr h, IntPtr pd);
    [DllImport("winspool.drv", EntryPoint="ClosePrinter")]
    public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv", EntryPoint="StartDocPrinterA")]
    public static extern int StartDocPrinter(IntPtr h, int level, ref DocInfo di);
    [DllImport("winspool.drv", EntryPoint="EndDocPrinter")]
    public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.drv", EntryPoint="StartPagePrinter")]
    public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.drv", EntryPoint="EndPagePrinter")]
    public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.drv", EntryPoint="WritePrinter")]
    public static extern bool WritePrinter(IntPtr h, byte[] buf, int len, out int written);
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    public struct DocInfo {
        [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)]
        public string pDocName;
        [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)]
        public string pOutputFile;
        [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)]
        public string pDataType;
    }
}
'@ -Language CSharp

$bytes = [IO.File]::ReadAllBytes($FilePath)
$hPrinter = [IntPtr]::Zero
[RawPrint]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero) | Out-Null
$di = [RawPrint+DocInfo]@{ pDocName = "Ticket"; pOutputFile = $null; pDataType = "RAW" }
[RawPrint]::StartDocPrinter($hPrinter, 1, [ref]$di) | Out-Null
[RawPrint]::StartPagePrinter($hPrinter) | Out-Null
$written = 0
[RawPrint]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written) | Out-Null
[RawPrint]::EndPagePrinter($hPrinter) | Out-Null
[RawPrint]::EndDocPrinter($hPrinter) | Out-Null
[RawPrint]::ClosePrinter($hPrinter) | Out-Null
Remove-Item $FilePath -Force
```

### 6.6 — `print-agent/index.mjs` — Loop principal

```js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { buildTicketCommands } from "./escpos-utils.mjs";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PS_SCRIPT = resolve(__dirname, "print-raw.ps1");
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTER_NAME } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Envía el buffer ESC/POS al spooler de Windows como datatype RAW.
// El spooler serializa con cualquier otro software que use la misma impresora.
// No requiere WinUSB ni ningún driver adicional.
function writeToWindowsPrinter(commands) {
  const tmpPath = join(tmpdir(), `gm_${Date.now()}.prn`);
  writeFileSync(tmpPath, Buffer.from(commands));
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_SCRIPT}" ` +
    `-PrinterName "${PRINTER_NAME}" -FilePath "${tmpPath}"`,
    { stdio: "pipe" }
  );
  // El script PS elimina el archivo temporal al finalizar
}

async function processJob(jobId, orderId, copies) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      order_number, table_number, items_snapshot,
      grand_total_usd_cents, grand_total_bs_cents,
      rate_snapshot_bs_per_usd, payment_method, created_at
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    await markError(jobId, error?.message ?? "Order not found");
    return;
  }

  try {
    for (let i = 0; i < copies; i++) {
      const commands = buildTicketCommands({
        ...order,
        orderNumber: order.order_number,
        tableNumber: order.table_number,
      });
      writeToWindowsPrinter(commands);
    }

    await supabase
      .from("print_jobs")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", jobId);

    console.log(`[OK] Pedido #${order.order_number} — ${copies} copia(s)`);
  } catch (err) {
    await markError(jobId, err.message);
  }
}

async function markError(jobId, msg) {
  await supabase
    .from("print_jobs")
    .update({ status: "error", error_message: msg })
    .eq("id", jobId);
  console.error(`[ERROR] Job ${jobId}:`, msg);
}

// Al arrancar: recuperar cualquier job pendiente que llegó mientras el agente estaba offline.
// "printing" huérfano también se recupera (agente murió entre fetch e impresión).
async function recoverPending() {
  const { data: jobs } = await supabase
    .from("print_jobs")
    .select("id, order_id, copies")
    .in("status", ["pending", "printing"]);

  if (jobs?.length) {
    console.log(`[RECOVERY] ${jobs.length} job(s) pendiente(s)`);
    for (const job of jobs) {
      await processJob(job.id, job.order_id, job.copies);
    }
  }
}

function subscribe() {
  supabase
    .channel("print-jobs-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "print_jobs" },
      (payload) => {
        const { id, order_id, copies } = payload.new;
        processJob(id, order_id, copies);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("🖨️  Conectado a Supabase Realtime. Esperando pedidos...");
      }
      if (status === "CHANNEL_ERROR") {
        console.error("[REALTIME] Error en canal. Reconectando en 5s...");
        setTimeout(subscribe, 5000);
      }
    });
}

await recoverPending();
subscribe();
```

### 6.6 — Instrucciones de instalación en Windows (incluir en `print-agent/README.md`)

1. Instalar Node.js 20 LTS.
2. Copiar la carpeta `print-agent/` al PC del local.
3. Crear `.env` con los valores correctos.
4. `npm install` en la carpeta.
5. Verificar el nombre exacto de la impresora en Windows: abrir PowerShell y ejecutar `Get-Printer | Select-Object Name`. Copiar el valor exacto en `PRINTER_NAME` del `.env`.
6. Ejecutar: `npm start`.
7. Opcional: instalar como servicio de Windows con `pm2` + `pm2-windows-startup`:
   ```
   npm install -g pm2
   pm2 start index.mjs --name gm-print-agent
   pm2 save
   pm2-windows-startup install
   ```

---

## PARTE 7 — COCINA: MOSTRAR `tableNumber`

### 7.1 — `src/components/kitchen/KitchenQueue.tsx`

En la tarjeta de cada orden, mostrar el número de mesa si existe:

```tsx
{order.tableNumber && (
  <span className="text-sm font-semibold text-amber-700">
    Mesa {order.tableNumber}
  </span>
)}
```

### 7.2 — `src/app/(admin)/admin/orders/OrdersClient.tsx`

Agregar columna "Mesa" en la tabla de órdenes del admin. Mostrar `—` si es nulo.

---

## PARTE 8 — ACTUALIZAR `AdminHeader` (BREADCRUMBS)

En `src/components/admin/layout/AdminHeader.tsx`, agregar al mapa `pathLabels`:

```ts
"tomar-pedido": "Tomar Pedido",
waiter: "Mesero",
```

---

## PARTE 9 — VARIABLES DE ENTORNO

No se agrega ninguna variable nueva a Vercel ni a `.env.example` del proyecto Next.js. El agente usa las credenciales de Supabase que ya existen (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — solo en el `.env` local del PC del local, nunca en el repo.

---

## PARTE 10 — CHECKLIST DE VERIFICACIÓN FINAL

El agente debe verificar cada ítem antes de considerar la tarea completa:

- [ ] `pnpm typecheck` pasa sin errores.
- [ ] `pnpm test` pasa (los tests existentes no rompen).
- [ ] `pnpm db:generate` genera exactamente dos cambios: nueva columna `table_number` en `orders` y nueva tabla `print_jobs`.
- [ ] Se puede crear un usuario con `role: "waiter"` en seed o SQL directo.
- [ ] El usuario waiter puede acceder a `/waiter` y no puede acceder a `/admin`.
- [ ] El usuario admin puede acceder a `/waiter` además de `/admin`.
- [ ] Enviar un pedido desde `/waiter` crea una orden en `status = "kitchen"` visible en `/kitchen`.
- [ ] La orden creada por mesero aparece en `/admin/orders` con la columna "Mesa".
- [ ] Se crea un registro en `print_jobs` con `status = "pending"` por cada orden de mesero.
- [ ] `ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs` ejecutado en Supabase SQL Editor.
- [ ] El `print-agent` arranca, se conecta a Supabase Realtime y loguea `"Conectado a Supabase Realtime"`.
- [ ] Al insertar un `print_job` manualmente en Supabase, el agente lo detecta en < 500 ms y loguea `[OK]`.
- [ ] Con la impresora USB conectada, el agente imprime 2 tickets por pedido.
- [ ] Al reiniciar el agente con jobs `"pending"` en DB, `recoverPending()` los procesa antes de suscribirse.

---

## NOTAS DE ARQUITECTURA PARA EL AGENTE

**¿Por qué el agente no usa `escpos-usb` (USB directo)?**
El driver de Windows para la impresora es `usbprint.sys` ("USB Printing Support"), que es el mismo que usa el software existente del local. `escpos-usb` necesita reemplazarlo por WinUSB vía Zadig para poder hacer `claimInterface()` — lo que destruye la impresora como destino del software existente. Incluso si ambos pudieran coexistir, escrituras USB simultáneas intercalarían bytes ESC/POS y el ticket saldría corrupto. La solución es que el agente envíe jobs al Windows Print Spooler (datatype RAW, via `winspool.drv`) igual que el software existente: el spooler los serializa y la colisión es estructuralmente imposible, sin tocar ningún driver.

**¿Por qué Supabase Realtime y no polling a Vercel?**
Vercel serverless no mantiene conexiones persistentes. El polling a Vercel genera ~9,600 invocaciones gratuitas desperdiciadas por turno de 8h. Con Supabase Realtime el agente abre un WebSocket directo contra Supabase (que sí mantiene conexiones persistentes), recibe el INSERT del `print_job` en < 100 ms, y Vercel nunca es invocado. El cliente Supabase JS maneja reconexiones automáticamente; el `recoverPending()` al arrancar cubre el caso de offline.

**¿Por qué `customerPhone: "mesa-{tableNumber}"` en lugar de null?**
El schema actual tiene `customerPhone NOT NULL`. En lugar de hacer una migración para hacerlo nullable (cambio breaking), se usa un valor placeholder semántico que también es útil para distinguir pedidos de mesero en logs.

**¿Por qué `paymentProvider: "whatsapp_manual"` para pedidos de mesero?**
Es el provider que pone la orden en estado `"whatsapp"` por defecto, pero nosotros sobreescribimos el status a `"kitchen"` directamente en la Server Action. Si se quiere más limpieza semántica, agregar `"in_person"` al enum de `paymentProvider` en el schema.

**ESC/POS y driver Windows:**
La impresora MR. TECNO Zy-Q821 es ESC/POS estándar. En Windows, el driver USB instala un puerto `COM` o un puerto `USB Printing Support`. La librería `escpos-usb` usa `node-usb` que necesita WinUSB o libusb. Si hay conflictos de driver, la alternativa más confiable en Windows es escribir al puerto `COM` o a `\\\\.\\USB001` con `fs.createWriteStream` — incluir esa alternativa comentada en `index.mjs`.

**Sesión del mesero:**
El login es el mismo `/login` existente. Auth.js redirige según la ruta que el mesero intentó acceder o a `/waiter` por defecto si no hay `callbackUrl`. Actualizar la lógica de redirect post-login en `src/app/(auth)/login/page.tsx` (o donde esté) para que si `role === "waiter"` y no hay `callbackUrl`, redirija a `/waiter`.
