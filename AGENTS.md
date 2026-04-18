# GM App — AGENT.md
> Documento de contexto operacional para agente de codificación. Leer **completo** antes de cualquier tarea.  
> Última actualización: basado en repomix del codebase activo.

---

## 0. REGLAS ABSOLUTAS — VIOLACIÓN = TAREA INVÁLIDA

```
1. Package manager: SOLO pnpm. Nunca npm / yarn / bun.
2. Validación: SOLO Valibot (`import * as v from "valibot"`). Nunca Zod, Yup, o inferencia manual.
3. Aritmética monetaria: SOLO enteros en cents. Nunca floats. Nunca string "36.50".
4. Tasa BCV: SOLO `getActiveRate()`. Nunca hardcodear un número.
5. DB operations: SOLO Supabase MCP (`apply_migration`, `execute_sql`). Nunca `pnpm db:migrate` ni `drizzle-kit push`.
6. Autenticación en rutas admin: verificar `session.user.role === "admin"` server-side SIEMPRE, aunque el middleware ya proteja.
7. Logging: SOLO `logger` de `@/lib/logger`. Nunca `console.log` en producción.
8. Cron jobs: SOLO `pg_cron` + `pg_net` de Supabase. Nunca Vercel Cron.
9. Pagos: SOLO factory pattern `getActiveProvider(settings)`. Nunca hardcodear un provider.
10. BANESCO_API_MOCK: DEBE estar ausente o `false` en producción. Verificar ANTES de tocar pagos.
```

---

## 1. Stack de Tecnologías — Versiones Exactas

| Capa | Paquete | Versión | Notas críticas |
|------|---------|---------|----------------|
| Framework | `next` | 15.4.11 | App Router, Turbopack en dev |
| Runtime UI | `react` / `react-dom` | 19.x | Concurrent features activas |
| Lenguaje | TypeScript | ^5.8.3 | `strict: true`, `noEmit` para typecheck |
| ORM | `drizzle-orm` | 0.41.x | + `drizzle-kit ^0.30.6` para generar migraciones |
| DB | PostgreSQL vía Supabase | — | `postgres` driver directo, no Supabase JS para queries |
| Auth | `next-auth` | 5.0.0-beta.29 | NextAuth v5 — API diferente a v4 |
| Validación | `valibot` | ^1.3.0 | **NO es Zod** — API distinta |
| Form resolver | `@hookform/resolvers/valibot` | — | Para React Hook Form + Valibot |
| Estado global | `zustand` | 5.x | + `zustand/middleware` `persist` |
| Server actions | `next-safe-action` | — | `actionClient` y `adminActionClient` en `@/lib/safe-action` |
| Cache / Rate limit | `@upstash/ratelimit` + Upstash Redis | — | Ver `@/lib/rate-limit` |
| HTTP admin | `@tanstack/react-query` v5 | — | `QueryProvider` en `src/providers/` |
| PWA | `serwist` | 9.5.6 | `src/app/sw.ts` + `next.config.ts` |
| Tests unitarios | `vitest` | ^4.1.0 | Config en `vitest.config.ts` |
| Tests E2E | `playwright` | — | Config en `playwright.config.ts` |
| Monitoring | `@sentry/nextjs` | — | `instrumentation.ts` + `instrumentation-client.ts` |
| Deploy | Vercel | — | `vercel.json` presente |
| UI Primitives | `@base-ui/react` | — | **NO es Radix UI** — Todos los `ui/` components usan `@base-ui` |
| Styling | Tailwind CSS | ^4.1.8 | Variables CSS en `globals.css` via `@theme` |
| Icons | `lucide-react` | — | Único set de iconos |
| Image upload | Supabase Storage | — | `@/lib/supabase.ts` y `@/lib/services/comprobante-upload.ts` |

---

## 2. Arquitectura de Directorios — Mapa Completo

```
src/
├── actions/                  ← Server Actions ("use server") — punto de entrada de mutations
│   ├── checkout.ts           ⚠️ CRÍTICO — flujo de orden completo
│   ├── orders.ts             — updateOrderStatusAction
│   ├── menu.ts               — CRUD items + generateUploadUrlAction, getPublicUrlAction
│   ├── daily-menu.ts         — syncDailyMenuAction, syncDailyAdicionalesAction, etc.
│   ├── settings.ts           — updateSettings, fetchActiveRate, fetchCheckoutSettings
│   ├── adicionales.ts        — saveMenuItemAdicionalesAction
│   ├── contornos.ts          — saveMenuItemContornosAction
│   ├── bebidas.ts            — saveMenuItemBebidasAction
│   ├── categories.ts         — getCategoryUsageCount
│   └── whatsapp-templates.ts — upsertTemplate, toggleTemplateActive
│
├── services/                 ← Lógica de negocio pura — importar desde actions/routes
│   ├── order.service.ts      ⚠️ CRÍTICO — processCheckout, calculateOrderTotals, createOrder, cancelOrder, updateOrderStatus
│   ├── menu.service.ts       — generateDailyMenuSnapshot, validateItemAvailability
│   └── payment.service.ts    — confirmPayment, processWebhookPayload, expireUnpaidOrders
│
├── db/
│   ├── index.ts              — export `db` (drizzle instance)
│   ├── schema/               ← Tipos Drizzle — ÚNICA fuente de verdad de tipos DB
│   │   ├── orders.ts         ⚠️ CRÍTICO
│   │   ├── settings.ts       ⚠️ CRÍTICO
│   │   ├── menu.ts           — menuItems, optionGroups, options
│   │   ├── categories.ts
│   │   ├── customers.ts
│   │   ├── exchangeRates.ts
│   │   ├── users.ts
│   │   ├── payments-log.ts
│   │   ├── whatsapp-templates.ts
│   │   ├── adicionales.ts    — menuItemAdicionales (join table)
│   │   ├── bebidas.ts        — menuItemBebidas (join table)
│   │   ├── contornos.ts      — menuItemContornos (join table con removable + substituteContornoIds)
│   │   ├── daily-menu-items.ts
│   │   ├── daily-adicionales.ts
│   │   ├── daily-bebidas.ts
│   │   ├── daily-contornos.ts
│   │   └── index.ts          — re-exporta todo el schema
│   ├── queries/              ← Funciones de DB — NUNCA inline queries en actions
│   │   ├── orders.ts         — createOrder, createOrderWithCapacityCheck, updateOrderStatus, getOrderById, expirePendingOrders, getKitchenOrdersSimple
│   │   ├── settings.ts       — getSettings, updateSettings, getActiveRate, getLatestRateByCurrency, invalidateSettingsCache
│   │   ├── menu.ts           — getMenuWithOptions, getMenuWithOptionsAndComponents, getDailyMenuWithOptionsAndComponents, getMenuItemById, etc.
│   │   ├── daily-menu.ts     — getDailyMenuWithOptionsAndComponents
│   │   ├── adicionales.ts    — getAllAdicionales, getAdicionalesByMenuItemId, setMenuItemAdicionales, getAdicionalUsageCount
│   │   ├── bebidas.ts        — getAllBebidas, getBebidasByMenuItemId, setMenuItemBebidas
│   │   ├── contornos.ts      — getAllContornos, getContornosByMenuItemId, setMenuItemContornos, getContornoUsageCount
│   │   ├── customers.ts      — getCustomerByPhone, upsertCustomer
│   │   ├── dashboard.ts      — getDashboardStats, getRecentOrders, getTodayOrdersRaw
│   │   ├── payments-log.ts
│   │   ├── whatsapp-templates.ts — getAllTemplates, getTemplateByKey, upsertTemplate, toggleTemplateActive
│   │   ├── sort-utils.ts     — buildMenuItemSortColumns, sortDailyMenuItems (MenuItemSortMode)
│   │   └── menu.ts           — getMenuItemProfitability, getWeightedAverageMarginToday, getStaleCostItems
│   ├── migrations/           ← SQL generado por drizzle-kit (excluido del repomix)
│   └── seed.ts
│
├── lib/
│   ├── auth.ts               ⚠️ CRÍTICO — NextAuth config + requireAdmin() + requireKitchenOrAdmin()
│   ├── safe-action.ts        — actionClient (público), adminActionClient (requiere admin session)
│   ├── money.ts              — usdCentsToBsCents, formatBs, formatRef, totalFromItems
│   ├── bcv.ts                — fetchBCVRates() (objeto), fetchBCVRate(currency) (número)
│   ├── rate-limit.ts         — rateLimiters.{checkout,paymentWebhook,orderStatus,lookup}, getIP(req)
│   ├── logger.ts             — logger.{info,warn,error}(msg, ctx)
│   ├── crypto.ts             — utilidades de idempotencia (tokens de checkout)
│   ├── utils.ts              — cn, obfuscatePhone, maskPhone, formatPhone, formatOrderDate, formatRate
│   ├── supabase.ts           — cliente Supabase JS (solo para Storage)
│   ├── supabase-image-loader.ts — loader para next/image con Supabase Storage
│   ├── clipboard-pago-movil.ts — buildPagoMovilClipboard(opts)
│   ├── constants/
│   │   └── order-status.ts   — type OrderStatus
│   ├── payment-providers/
│   │   ├── types.ts          ⚠️ CRÍTICO — ProviderId, PaymentProvider interface, PaymentInitResult, PaymentConfirmResult, BankDetails, SettingsRow, OrderRow
│   │   ├── factory.ts        — getActiveProvider(settings), getProviderById(id, settings)
│   │   ├── banesco-reference.ts
│   │   ├── mercantil-c2p.ts
│   │   ├── mercantil-crypto.ts — mercantilEncrypt, mercantilDecrypt
│   │   ├── bnc-feed.ts
│   │   └── whatsapp-manual.ts
│   ├── payments/
│   │   └── format-provider.ts  — formatProvider(slug)
│   ├── services/
│   │   └── comprobante-upload.ts — uploadComprobante(file, orderId): UploadResult
│   ├── types/
│   │   └── checkout.ts       — CheckoutItem type (la forma que entra al action)
│   ├── utils/
│   │   ├── date.ts           — todayCaracas(): string  (formato YYYY-MM-DD en America/Caracas)
│   │   ├── calculate-surcharges.ts — calculateSurcharges, buildSurchargesSnapshot, SurchargeItem, SurchargeSettings, SurchargeResult, SurchargesSnapshot
│   │   ├── format-items.ts   — formatItems(items, maxVisible)
│   │   ├── format-items-detailed.ts — formatItemsDetailed(items, formatPrice, formatRef), SnapshotItem type
│   │   ├── format-relative-time.ts  — formatOrderTime(date)
│   │   └── build-whatsapp-payload.ts — appendComprobanteToMessage, buildFinalWaLink
│   ├── validations/
│   │   ├── checkout.ts       — checkoutSchema (Valibot), CheckoutInput type, ClientSurcharges type
│   │   ├── settings.ts       — settingsSchema
│   │   ├── menu-item.ts      — menuItemSchema, menuItemFormSchema, MenuItemInput, OptionGroupInput
│   │   └── webhook.ts        — schema para validar webhooks de pago
│   └── whatsapp/
│       ├── client.ts         — cliente WhatsApp (instancia/sessión)
│       └── messages.ts       — sendOrderMessage(orderId, settings, customer)
│
├── hooks/                    ← React hooks — solo usar en Client Components
│   ├── useCartCalculation.ts
│   ├── useCheckoutForm.ts
│   ├── useCheckoutSurcharges.ts  — UseCheckoutSurchargesReturn (surcharges, grandTotalBsCents, etc.)
│   ├── useComprobanteUpload.ts   — UseComprobanteUploadReturn
│   ├── useDailyMenuState.ts
│   ├── useDailyMenuSync.ts
│   ├── useItemContornos.ts
│   ├── useItemDetailModal.ts     — UseItemDetailModalReturn (maneja toda la lógica modal del menú)
│   ├── useMenuItemForm.ts        — UseMenuItemFormReturn (admin form para items)
│   ├── useOnlineStatus.ts
│   └── useSettingsForm.ts
│
├── store/
│   └── cartStore.ts          — CartItem, CartState, useCartStore (Zustand persist)
│
├── types/
│   ├── index.ts              — Order, NewOrder, Customer, DailyMenuItem, SystemSettings, etc. (inferidos de schema)
│   ├── menu.types.ts         — MenuItemWithComponents, ContornoComponent, SimpleComponent, OptionGroupWithOptions, OptionItem, DbMenuItem
│   └── contorno.types.ts     — ContornoSelection { id, name, removable, substituteContornoIds }
│
├── providers/
│   └── QueryProvider.tsx     — TanStack Query client wrapper
│
├── app/
│   ├── layout.tsx            — RootLayout, Epilogue + Plus_Jakarta_Sans fonts, generateMetadata
│   ├── globals.css           — @theme Tailwind v4, variables CSS, utilidades custom
│   ├── sw.ts                 — Entry point del Service Worker (Serwist)
│   ├── global-error.tsx      — Error boundary Sentry
│   ├── login/                — LoginForm, page
│   ├── (public)/             — Menú cliente, checkout, mis-pedidos
│   │   ├── page.tsx          — Server Component: carga menu + rate + settings
│   │   ├── layout.tsx        — Glassmorphic header
│   │   ├── MenuClient.tsx    — Client Component: MenuHeader + MenuGrid
│   │   ├── checkout/         — CheckoutClient, CheckoutPage, /expired
│   │   ├── mis-pedidos/
│   │   ├── HeaderCartButton.tsx
│   │   └── CategoryFilterClient.tsx
│   ├── (admin)/admin/        — Panel admin (requireAdmin)
│   │   ├── page.tsx          — Dashboard
│   │   ├── catalogo/         — CRUD items: page, new, [id]/edit
│   │   ├── categories/       — CategoriesClient
│   │   ├── menu-del-dia/     — DailyMenuClient + subcomponentes
│   │   ├── orders/           — OrdersClient, [id]/page
│   │   └── settings/         — SettingsForm + tabs (General, Operation, Payments, Messaging, Design)
│   ├── (kitchen)/kitchen/    — KDS: requireKitchenOrAdmin
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── admin/orders/[id]/{status,cancel,confirm-manual,confirm-with-ref}/route.ts
│       ├── admin/orders/{route,counts}/route.ts
│       ├── admin/whatsapp/{qr,reconnect,status}/route.ts
│       ├── cron/{expire-orders,update-rate}/route.ts  ← CRON_SECRET auth
│       ├── customers/lookup/route.ts
│       ├── kitchen-orders/route.ts
│       ├── orders/[id]/status/route.ts
│       ├── orders/by-phone/[phone]/route.ts
│       ├── payment-confirm/route.ts
│       ├── payment-webhook/route.ts
│       └── settings/public/route.ts
│
├── components/
│   ├── ui/                   ← Primitivos shadcn sobre @base-ui/react (NO Radix)
│   │   ├── badge, button, card, dialog, dropdown-menu
│   │   ├── input, label, radio-group, select, separator
│   │   ├── sheet, skeleton, switch, table, tabs, tooltip
│   │   └── (todos usan cn() + cva + @base-ui primitives)
│   ├── admin/
│   │   ├── dashboard/OrdersChart.tsx
│   │   ├── layout/{AdminHeader,Sidebar}.tsx
│   │   ├── menu/{MenuItemForm,MenuItemImageUpload,MenuItemPriceSection,AdicionalesSection,BebidasSection,ContornosSection}.tsx
│   │   ├── orders/{OrderTable,OrderCard,OrderList,OrderActions,OrderPaymentPanel,OrderStatusBadge,OrderModeChip,OrderTimeline,OrderItemsTable,QuickActions,ConfirmPaymentButton}.tsx
│   │   ├── settings/{HeroImageUpload,RestaurantLogoUpload}.tsx
│   │   └── whatsapp/{TemplateEditor,WhatsAppStatus}.tsx
│   ├── customer/
│   │   ├── ItemDetailModal.tsx (dispatcher: Modern vs Classic)
│   │   ├── ItemDetailModalModern.tsx / ItemDetailModalClassic.tsx
│   │   ├── AdicionalesList, BebidasList, ContornoSelector, OptionGroupSection
│   │   ├── ModalFooter, MenuGridSkeleton, OfflineBanner
│   │   └── ItemDetailModal.types.ts — SimpleItem type
│   ├── kitchen/KitchenQueue.tsx
│   ├── public/
│   │   ├── ActiveOrdersBanner.tsx
│   │   ├── cart/{Cart,CartButton,CartItem}.tsx
│   │   ├── checkout/{CheckoutForm,CheckoutStickyFooter,ComprobanteUpload,CopyAllButton,CopyButton,OrderModeSelector,OrderSummary,PagoMovilScreen,PaymentDetails,PaymentMethodSelector,PaymentSuccess,ReferenceEntry,WaitingPayment,WhatsAppPayment}.tsx
│   │   └── menu/{CategoryFilter,MenuGrid,MenuHeader,MenuItemCard,MenuItemCardClassic,MenuItemCardModern}.tsx
│   └── shared/DateNavigator.tsx
│
├── middleware.ts             — Protege /admin/* y /kitchen/* en el edge
└── instrumentation.ts / instrumentation-client.ts — Sentry init
```

---

## 3. Patrones de Código — Uso Correcto

### 3.1 Server Actions con next-safe-action

```typescript
// ✅ Action pública (cualquier usuario)
import { actionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const miAction = actionClient
  .schema(v.object({ campo: v.string() }))
  .action(async ({ parsedInput }) => {
    // parsedInput ya está validado y tipado
    return { success: true };
  });

// ✅ Action solo admin
import { adminActionClient } from "@/lib/safe-action";

export const miAdminAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput, ctx }) => {
    // ctx.session disponible con rol verificado
    return { success: true };
  });
```

### 3.2 Validación Valibot

```typescript
import * as v from "valibot";

// Schema básico
const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Requerido")),
  price: v.pipe(v.number(), v.integer(), v.minValue(0)),
  optional: v.optional(v.string()),
  email: v.pipe(v.string(), v.email()),
  enum: v.picklist(["a", "b", "c"] as const),
});

// Safe parse (no lanza excepción)
const result = v.safeParse(schema, input);
if (!result.success) {
  return { success: false, error: result.issues[0].message };
}
const data = result.output; // tipado

// Inferir tipo de output
type MyType = v.InferOutput<typeof schema>;
```

### 3.3 Autenticación en API Routes

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // continuar...
}
```

### 3.4 Tasa BCV y Dinero

```typescript
import { getActiveRate } from "@/db/queries/settings";
import { usdCentsToBsCents, formatBs, formatRef } from "@/lib/money";

// Leer tasa (NUNCA hardcodear)
const { rate, fetchedAt } = await getActiveRate();
// rate: number (Bs por USD)

// Convertir (resultado en cents enteros)
const bsCents = usdCentsToBsCents(priceUsdCents, rate);

// Formatear para display
const bsStr = formatBs(bsCents);     // "Bs. 1.234,56"
const refStr = formatRef(usdCents);  // "$1.23"
```

### 3.5 Rate Limiting en API Routes

```typescript
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const ip = getIP(req);
  const { success } = await rateLimiters.checkout.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
}
// Limiters disponibles: checkout (10/min), paymentWebhook (100/min), orderStatus (30/min), lookup (20/min)
```

### 3.6 Logging y Sentry

```typescript
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// Logging estructurado
logger.info("Orden creada", { orderId, customerId });
logger.warn("Referencia duplicada", { reference, orderId });
logger.error("Error en pago", { error: err.message, provider: "banesco" });

// Errores críticos de pagos → también Sentry
Sentry.captureException(err, { extra: { context: "payment-webhook", orderId } });
```

### 3.7 Sistema de Pagos — Factory Pattern

```typescript
import { getActiveProvider } from "@/lib/payment-providers";
// o para un provider específico:
import { getProviderById } from "@/lib/payment-providers";
import { getSettings } from "@/db/queries/settings";

const settings = await getSettings();

// Provider activo (desde settings.activePaymentProvider)
const provider = getActiveProvider(settings);

// Iniciar pago
const initResult = await provider.initiatePayment(order, settings);
// initResult.screen: "enter_reference" | "c2p_pending" | "waiting_auto" | "whatsapp" | "error"

// Confirmar pago
const confirmResult = await provider.confirmPayment({
  type: "reference",
  reference: "12345678",
  orderId: "uuid",
});
// confirmResult.success: boolean
// Si false: confirmResult.reason: "invalid_reference" | "amount_mismatch" | "already_used" | "expired" | "api_error"
```

### 3.8 Checkout Flow Completo

```
CartStore (client) → checkoutAction → processCheckout (order.service) →
  1. validateItemAvailability (menu.service)
  2. calculateOrderTotals (verifica precios server-side)
  3. createOrderWithCapacityCheck (db/queries/orders)
  4. getActiveProvider → initiatePayment
  5. after(): sendOrderMessage (whatsapp) via next/server after()
```

### 3.9 Surcharges (Empaques y Delivery)

```typescript
import { calculateSurcharges, buildSurchargesSnapshot } from "@/lib/utils/calculate-surcharges";

// settings necesita: packagingFeePerPlateUsdCents, packagingFeePerAdicionalUsdCents,
//                    packagingFeePerBebidaUsdCents, deliveryFeeUsdCents

const surcharges = calculateSurcharges(items, orderMode, settings);
// surcharges.packagingUsdCents, deliveryUsdCents, totalSurchargeUsdCents

const snapshot = buildSurchargesSnapshot(surcharges, orderMode, settings);
// Se guarda en orders.surchargesSnapshot
```

> ⚠️ TRAMPA: Los adicionales son tarifas PLANAS por ítem único del carrito, NO multiplicar por cantidad de platos.

### 3.10 Tipos Clave del Schema

```typescript
// Inferir desde schema Drizzle (NUNCA redefinir):
import type { orders, settings, customers, menuItems } from "@/db/schema";
import type { PaymentProvider, SettingsRow, OrderRow } from "@/lib/payment-providers/types";

type Order = typeof orders.$inferSelect;    // desde @/types/index.ts como `Order`
type Settings = typeof settings.$inferSelect; // como `SystemSettings`

// Order status values (EXACTOS):
// "pending" | "paid" | "kitchen" | "delivered" | "cancelled" | "expired" | "whatsapp"

// Payment providers disponibles:
// "banesco_reference" | "mercantil_c2p" | "bnc_feed" | "whatsapp_manual"

// Order modes:
// "on_site" | "take_away" | "delivery" | null
```

---

## 4. Tipos del Dominio — Referencia Rápida

### CartItem (Zustand store)
```typescript
interface CartItem {
  id: string; name: string; emoji: string;
  baseUsdCents: number; baseBsCents: number;
  fixedContornos: Array<{ id; name; priceUsdCents; priceBsCents }>;
  contornoSubstitutions: ContornoSubstitution[];
  selectedAdicionales: Array<{ id; name; priceUsdCents; priceBsCents; quantity }>;
  selectedBebidas?: Array<{ id; name; priceUsdCents; priceBsCents; quantity }>;
  removedComponents: RemovedComponent[]; // { isRemoval: true; componentId; name; priceUsdCents }
  quantity: number;
  itemTotalBsCents: number;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  categoryName: string;
}
```

### CheckoutItem (lo que entra al server action)
```typescript
// src/lib/types/checkout.ts
type CheckoutItem = {
  id: string; quantity: number;
  fixedContornos: Array<{ id; name; priceUsdCents; priceBsCents }>;
  selectedAdicionales: Array<{ id; name; priceUsdCents; priceBsCents; quantity; substitutesComponentId?; substitutesComponentName? }>;
  selectedBebidas?: Array<{ id; name; priceUsdCents; priceBsCents; quantity }>;
  removedComponents: Array<{ isRemoval: true; componentId; name; priceUsdCents }>;
  categoryAllowAlone: boolean; categoryIsSimple: boolean; categoryName: string;
};
```

### MenuItemWithComponents
```typescript
// src/types/menu.types.ts
interface MenuItemWithComponents {
  id; name; description; priceUsdCents; categoryId; categoryName;
  categoryAllowAlone; categoryIsSimple; isAvailable; imageUrl; sortOrder;
  optionGroups: OptionGroupWithOptions[];    // radio/checkbox legacy
  adicionales: SimpleComponent[];           // { id; name; priceUsdCents; isAvailable; sortOrder }
  bebidas: SimpleComponent[];
  contornos: ContornoComponent[];           // extends SimpleComponent + removable + substituteContornoIds
}
```

### SnapshotItem (para guardar en orders y formatear)
```typescript
// src/lib/utils/format-items-detailed.ts
interface SnapshotItem {
  id; name; priceUsdCents; priceBsCents; quantity;
  fixedContornos: Array<{ id; name; priceUsdCents; priceBsCents }>;
  selectedAdicionales: Array<{ id; name; priceUsdCents; priceBsCents; quantity?; substitutesComponentId?; substitutesComponentName? }>;
  selectedBebidas?: Array<{ id; name; priceUsdCents; priceBsCents; quantity? }>;
  removedComponents?: Array<{ isRemoval?; componentId?; name; priceUsdCents }>;
  itemTotalBsCents: number;
}
```

---

## 5. Variables de Entorno

```bash
# Base de datos
DATABASE_URL=                    # Supabase PostgreSQL direct URL
DIRECT_URL=                      # Supabase PostgreSQL direct (sin pooler, para migraciones)

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Supabase Storage (comprobantes, imágenes)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pagos
BANESCO_API_URL=
BANESCO_API_KEY=
BANESCO_API_MOCK=               # ⚠️ DEBE estar ausente o "false" en producción
MERCANTIL_C2P_SECRET=
BNC_FEED_SECRET=

# Cron (Supabase pg_cron → pg_net → estos endpoints)
CRON_SECRET=                     # Header Bearer para /api/cron/*

# BCV (sin credenciales — scraper público)
# La tasa vive en DB: exchange_rates → settings.currentRateId
```

---

## 6. Base de Datos — Convenciones

### Flujo de Migraciones

```bash
# 1. Modificar schema en src/db/schema/*.ts
# 2. Generar SQL
pnpm db:generate       # genera en src/db/migrations/
# 3. Revisar el SQL generado MANUALMENTE
# 4. Aplicar OBLIGATORIAMENTE vía Supabase MCP:
#    → apply_migration(nombre, sql_content)
#    NUNCA: pnpm db:migrate  /  drizzle-kit push  /  bash directo
```

### Queries — Patrón

```typescript
// ✅ Siempre en src/db/queries/*.ts — nunca inline en actions/routes
import { db } from "@/db";
import { orders, customers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getOrderById(id: string) {
  return db.query.orders.findFirst({ where: eq(orders.id, id) });
}
```

### Settings — Caché

```typescript
// Settings tiene caché internal — después de actualizar, invalidar:
import { invalidateSettingsCache } from "@/db/queries/settings";
await invalidateSettingsCache();
// + revalidatePath si es necesario
```

---

## 7. Diseño Visual — Tokens Exactos

```css
/* Heritage Red (Primary) — acciones de alto impacto */
--primary: #bb0005;
/* Primary Container — hero, gradients */
--primary-container: #e2231a;
/* Warm Cream (Surface) — background base */
--surface: #fff8f3;
/* Surface Low — secciones secundarias */
--surface-low: #fff2e2;
/* Ink Black — texto principal */
--on-surface: #251a07;
/* Secondary — etiquetas, texto secundario */
--secondary: #5f5e5e;
```

**Tipografía:**
```tsx
// Fuentes cargadas en src/app/layout.tsx:
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
// Epilogue → Display y Headlines
// Plus Jakarta Sans → Body y Labels
```

**Reglas de diseño:**
- **Cero** líneas separadoras de 1px — usar tonal shifts entre superficies
- Botones: pill-shaped (`rounded-full`), tamaño `xl` (3rem)
- Cards: redondez asimétrica
- Nav / Modales: glassmorphism con `backdrop-blur-[20px]`
- Display: **Bs. primero** (prominente grande) — REF debajo (pequeño, secundario)

**UI Components — Usar `@base-ui/react` internamente:**
```tsx
// Los componentes en src/components/ui/ ya envuelven @base-ui
// NO importar directamente desde radix-ui — no está instalado
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// etc.
```

---

## 8. Testing

```bash
pnpm test            # Vitest — todos los tests
pnpm test:unit       # Solo unitarios
pnpm test:integration # Solo integración
# E2E: playwright (require servidor corriendo)
```

**Estructura de tests:**
```
tests/
├── __mocks__/           ← next-cache, next-navigation, next-server mocks
├── e2e/checkout.spec.ts
├── integration/api/payment-webhook.test.ts
└── unit/
    ├── actions/checkout.test.ts
    ├── api/expire-orders.test.ts
    ├── bcv.test.ts
    ├── db/daily-menu-sorting.test.ts
    ├── hooks/{useCartCalculation,useCheckoutForm,useCheckoutSurcharges,useMenuItemForm}.test.ts
    └── lib/{calculate-surcharges,crypto,mercantil-c2p,mercantil-crypto,money,validations/settings}.test.ts
    └── store/cartStore.test.ts
```

---

## 9. Comandos de Desarrollo

```bash
pnpm dev              # Next.js dev con Turbopack
pnpm build            # Build producción
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit (sin emitir JS)
pnpm db:generate      # Genera SQL de migración (revisar antes de aplicar)
# NO usar: pnpm db:migrate
```

---

## 10. Gaps Conocidos — NO implementar sin instrucción explícita

| Gap | Descripción | Archivos afectados |
|-----|-------------|-------------------|
| **IGTF** | Impuesto 3% en transacciones en divisa (USD) | `src/lib/money.ts`, checkout totales |
| **mercantil_crypto** | Provider documentado pero estado de integración incierto | `src/lib/payment-providers/mercantil-crypto.ts` |
| **Reintentos WhatsApp** | No hay retry automático en sendOrderMessage | `src/lib/whatsapp/messages.ts` |

---

## 11. Trampas Comunes — NO Cometer

```
❌ Usar `v.parse()` en lugar de `v.safeParse()` → lanza excepción no controlada
❌ Multiplicar surcharges de adicionales × cantidad de platos → son tarifas planas
❌ Usar `new Date()` sin timezone → usar todayCaracas() para fechas operativas
❌ Exportar un componente Server que usa hooks → error en runtime
❌ Usar `import { useRouter } from "next/router"` → en App Router es "next/navigation"
❌ Inline queries en actions/routes → siempre usar funciones de db/queries/
❌ Crear un nuevo provider de pagos sin implementar la interfaz PaymentProvider completa
❌ Asumir que @base-ui tiene la misma API que Radix → revisar tipos antes de usar
❌ Usar `revalidateTag` sin que el tag esté definido con `unstable_cache` o similar
❌ Leer `settings.activePaymentProvider` directamente en el cliente → es info sensible
❌ Llamar `getActiveRate()` múltiples veces en el mismo request → una sola llamada al inicio
```

---

## 12. Árbol de Decisión — ¿Qué archivo tocar?

| Tarea | Archivo principal | Archivos secundarios |
|-------|------------------|---------------------|
| Nueva mutation de datos | `src/actions/[dominio].ts` | `src/db/queries/[dominio].ts` |
| Nueva query compleja | `src/db/queries/[dominio].ts` | `src/db/schema/[tabla].ts` |
| Nuevo campo en tabla | `src/db/schema/[tabla].ts` → `pnpm db:generate` → MCP apply | `src/types/index.ts` si exporta tipo |
| Nueva pantalla admin | `src/app/(admin)/admin/[ruta]/page.tsx` | `src/components/admin/[dominio]/` |
| Nueva pantalla pública | `src/app/(public)/[ruta]/page.tsx` | `src/components/public/` |
| Nueva API route | `src/app/api/[ruta]/route.ts` | Verificar auth + rate limit |
| Nuevo hook de UI | `src/hooks/use[Nombre].ts` | Tipos en `src/types/` si son complejos |
| Cambio en cálculo de precios | `src/lib/money.ts` | `src/lib/utils/calculate-surcharges.ts` |
| Cambio en flujo de checkout | `src/services/order.service.ts` | `src/actions/checkout.ts` |
| Nuevo provider de pago | `src/lib/payment-providers/[nombre].ts` | `src/lib/payment-providers/factory.ts`, `types.ts` |
| Nuevo template WhatsApp | `src/lib/whatsapp/messages.ts` | `src/db/queries/whatsapp-templates.ts` |
| Cambio en diseño visual | `src/app/globals.css` | Componente específico |

---

## 13. Verificación Pre-Commit

Antes de finalizar cualquier tarea, verificar:

```bash
pnpm typecheck    # ← 0 errores TypeScript requeridos
pnpm lint         # ← 0 warnings nuevos
pnpm test:unit    # ← tests existentes pasan
```

Si se modificó `checkout.ts` u `order.service.ts`:
- Revisar que el total calculado server-side ≠ lo que envió el cliente (re-cálculo obligatorio)
- Verificar que `ensureCheckoutToken()` se use para idempotencia
- Verificar que `after()` de Next.js envuelve el WhatsApp send

Si se modificó cualquier schema Drizzle:
- `pnpm db:generate` ejecutado
- SQL revisado manualmente
- `apply_migration` vía Supabase MCP (no bash)