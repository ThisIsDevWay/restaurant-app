# GM App — Instrucciones para el agente

## Stack real del proyecto

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15.4 (App Router) + React 19 |
| Lenguaje | TypeScript estricto |
| ORM | Drizzle ORM 0.41 + PostgreSQL (Supabase) |
| Auth | NextAuth v5 beta (`next-auth@5.0.0-beta.29`) |
| Validación | **Valibot** (`import * as v from "valibot"`) — **NO es Zod** |
| Estado global | Zustand 5 |
| Cache/Rate limit | Upstash Redis + `@upstash/ratelimit` |
| HTTP client admin | TanStack Query v5 |
| PWA | Serwist 9.5.6 |
| Tests | Vitest + Playwright |
| Monitoring | Sentry (`@sentry/nextjs`) |
| Deploy | Vercel |
| Package manager | **pnpm** — nunca uses npm/yarn/bun |

## Arquitectura de directorios

```
src/
├── actions/           ← Server actions (Next.js "use server")
│   ├── checkout.ts    ← ⚠️ CRÍTICO: no modificar sin leer completo
│   ├── orders.ts
│   ├── menu.ts
│   ├── daily-menu.ts
│   ├── settings.ts
│   ├── adicionales.ts
│   ├── contornos.ts
│   ├── bebidas.ts
│   └── categories.ts
│
├── app/
│   ├── (admin)/admin/         ← Panel admin (protegido: rol admin)
│   │   ├── catalogo/          ← CRUD de platos (new, [id]/edit)
│   │   ├── categories/        ← Gestión de categorías
│   │   ├── menu-del-dia/      ← Selección diaria de items activos
│   │   ├── orders/            ← Lista y detalle de pedidos
│   │   └── settings/          ← Configuración del restaurante
│   ├── (kitchen)/kitchen/     ← KDS (protegido: roles admin + kitchen)
│   ├── (public)/              ← Menú cliente + checkout + mis-pedidos
│   └── api/
│       ├── admin/orders/[id]/ ← status, cancel, confirm-manual
│       ├── cron/              ← expire-orders, update-rate (BCV scraper)
│       ├── payment-confirm/   ← Confirmación de referencia (cliente)
│       ├── payment-webhook/   ← Webhook de proveedores pasivos
│       └── ...
│
├── db/
│   ├── schema/        ← Tipos Drizzle — importar de aquí, NO redefinir
│   │   ├── orders.ts  ← ⚠️ CRÍTICO
│   │   ├── settings.ts
│   │   ├── menu.ts
│   │   ├── customers.ts
│   │   ├── exchangeRates.ts
│   │   ├── payments-log.ts
│   │   └── ...
│   ├── queries/       ← Funciones de DB (nunca queries inline en actions)
│   └── migrations/    ← SQL generado por drizzle-kit
│
├── lib/
│   ├── auth.ts        ← ⚠️ CRÍTICO: NextAuth config + requireAdmin()
│   ├── bcv.ts         ← Scraper BCV (fetchBCVRates, fetchBCVRate)
│   ├── money.ts       ← usdCentsToBsCents, formatBs, formatRef
│   ├── rate-limit.ts  ← rateLimiters (checkout, paymentWebhook, etc)
│   ├── logger.ts      ← logger.info/warn/error (JSON estructurado)
│   ├── payment-providers/
│   │   ├── types.ts            ← Interfaces PaymentProvider, ProviderId
│   │   ├── factory.ts          ← getActiveProvider(settings)
│   │   ├── banesco-reference.ts
│   │   ├── mercantil-c2p.ts
│   │   ├── bnc-feed.ts
│   │   └── whatsapp-manual.ts
│   └── validations/
│       ├── checkout.ts   ← checkoutSchema (Valibot)
│       ├── settings.ts   ← settingsSchema (Valibot)
│       └── menu-item.ts  ← (Valibot)
│
└── store/
    └── cartStore.ts   ← Zustand — estado del carrito del cliente
```

## Contexto de negocio

Sistema de pedidos y gestión de cocina para restaurante venezolano (G&M).
Los clientes piden sin crear cuenta. Los pagos son venezolanos: pago móvil
(referencia numérica) o transferencia bancaria. Sin tarjetas internacionales.

Restricciones del mercado venezolano que afectan el diseño:
- **Conectividad intermitente**: PWA offline-first vía Serwist. El SW cachea
  el menú para que funcione sin internet.
- **Doble moneda**: precios almacenados en USD cents (`price_usd_cents`).
  Se muestran en Bs. (prominente) y REF (pequeño abajo). La tasa BCV
  se scraping diariamente ~6PM VET y se guarda en `exchange_rates` DB.
- **Pagos provider-agnostic**: factory pattern, el proveedor activo se
  configura en `settings.active_payment_provider`.
- **IGTF (⚠️ GAP PENDIENTE)**: Impuesto del 3% a transacciones en divisa.
  No está implementado en el codebase. Afectaría `src/lib/money.ts`
  y el cálculo de totales en checkout.

## Sistema de pagos (factory pattern)

```typescript
// Flujo correcto — NUNCA hardcodear el provider
import { getActiveProvider } from "@/lib/payment-providers";
const provider = getActiveProvider(settings); // lee settings.activePaymentProvider
const initResult = await provider.initiatePayment(order, settings);
```

Proveedores implementados:
- `banesco_reference` — Cliente ingresa referencia → app la verifica
- `mercantil_c2p` — C2P interbancario vía Mercantil
- `bnc_feed` — Feed automático BNC (modelo Cashea, confirmación 2-20s)
- `whatsapp_manual` — Fallback: cliente envía comprobante por WhatsApp

**Variable de mock**: `BANESCO_API_MOCK=true` (no `ENABLE_MOCK_BANKING`).
Debe estar AUSENTE o `false` en producción. Verificar antes de tocar
cualquier flujo de pagos.

## Sistema de tasa BCV

La tasa de cambio NO vive en Redis. Vive en la base de datos:

```
exchange_rates tabla → settings.current_rate_id → getActiveRate()
```

```typescript
// ✅ Correcto — siempre usar esta función
import { getActiveRate } from "@/db/queries/settings";
const rateResult = await getActiveRate(); // { rate: number, fetchedAt: string }

// ✅ Override manual disponible en settings
// settings.rateOverrideBsPerUsd tiene precedencia sobre current_rate_id

// ❌ NUNCA hardcodees una tasa
const rate = 36.50; // NUNCA
```

El scraper BCV corre en `GET /api/cron/update-rate` (autenticado con `CRON_SECRET`).
Inserta en `exchange_rates` y actualiza `settings.currentRateId`.

## Cálculo de precios

```typescript
// Siempre usar — src/lib/money.ts
import { usdCentsToBsCents, formatBs, formatRef } from "@/lib/money";

// Aritmética en enteros, nunca floats
const bsCents = usdCentsToBsCents(priceUsdCents, rate);
```

Display: **Bs. primero** (prominente), REF debajo (pequeño). Es una decisión
de UX deliberada que refleja el contexto de compra venezolano.

## Autenticación y autorización

```typescript
// En server actions o API routes que requieren admin
import { requireAdmin } from "@/lib/auth";
const session = await requireAdmin(); // redirige a /login si no es admin

// Para kitchen
import { requireKitchenOrAdmin } from "@/lib/auth";
const session = await requireKitchenOrAdmin();

// Para verificar en API routes (no redirige, retorna null)
import { auth } from "@/lib/auth";
const session = await auth();
if (!session?.user?.role || session.user.role !== "admin") {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}
```

El middleware en `src/middleware.ts` protege `/admin/*` y `/kitchen/*` en el
borde de Vercel. Aun así, SIEMPRE verifica rol en el server action o route.

## Rate limiting

```typescript
import { rateLimiters, getIP } from "@/lib/rate-limit";
// Limiters disponibles:
// rateLimiters.checkout        — 10 req/min por IP
// rateLimiters.paymentWebhook  — 100 req/min
// rateLimiters.orderStatus     — 30 req/min
// rateLimiters.lookup          — 20 req/min
```

## Logging

```typescript
import { logger } from "@/lib/logger";
// Siempre logger, nunca console.log en producción
logger.info("Mensaje", { contexto: "valor" });
logger.warn("Advertencia", { campo: valor });
logger.error("Error crítico", { error: err.message });
```

Para errores de pagos, además de `logger.error`:
```typescript
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(err, { extra: { context: "payment-webhook" } });
```

## Validación (Valibot — NO es Zod)

```typescript
import * as v from "valibot";

const schema = v.object({
  field: v.pipe(v.string(), v.minLength(1)),
  optional: v.optional(v.string()),
});

const parsed = v.safeParse(schema, input);
if (!parsed.success) {
  const issue = parsed.issues[0];
  return { success: false, error: issue.message };
}
const data = parsed.output;
```

Los schemas existentes están en `src/lib/validations/`.

## Diseño visual ("Tierra y Fogón")

| Token | Hex | Uso |
|-------|-----|-----|
| Rojo Fogón | `#8B2500` | Primary, CTAs |
| Naranja Brasa | `#D4580A` | Hover states |
| Verde Selva | `#2D6A1F` | Precios en Bs., success |
| Crema Cálido | `#FDF6EE` | Background |
| Marrón Profundo | `#1C1410` | Texto principal |

Tipografía: Inter (body), Playfair Display (logo únicamente).

## Comandos de desarrollo

```bash
pnpm dev          # Next.js dev (Turbopack)
pnpm build        # Build de producción
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit (sin emitir archivos)
pnpm test         # Vitest (todos los tests)
pnpm test:unit    # Solo tests unitarios
pnpm test:integration  # Solo tests de integración

# Base de datos
pnpm db:generate  # Genera migración SQL (revisar antes de aplicar)
pnpm db:migrate   # Aplica migraciones (NO correr en prod sin revisar)
pnpm db:studio    # Drizzle Studio (UI de DB)
```

## Reglas de código

1. **Nunca** expongas endpoints admin sin verificar `session.user.role === "admin"` server-side
2. **Siempre** usa Valibot para validar inputs de API routes antes de tocar la DB
3. Los tipos de Drizzle se importan desde `@/db/schema`, nunca los redefinas
4. `BANESCO_API_MOCK` debe estar AUSENTE en producción — verifica antes de tocar pagos
5. Los errores críticos de pagos van a Sentry con `Sentry.captureException()`
6. La tasa BCV se lee con `getActiveRate()`, nunca hardcodeada
7. Aritmética monetaria siempre en cents (enteros), nunca floats

## Archivos críticos — leer antes de modificar

- `src/actions/checkout.ts` — flujo completo de pedido + pagos
- `src/lib/auth.ts` — NextAuth config + helpers de autorización
- `src/db/schema/orders.ts` — schema de órdenes con snapshot tipado
- `src/lib/payment-providers/factory.ts` — entry point del factory
- `src/lib/payment-providers/types.ts` — contratos de la interfaz

## Migraciones de base de datos

```bash
# Flujo correcto
pnpm db:generate          # 1. Generar SQL en /src/db/migrations/
# → Revisar el SQL generado manualmente
# → Aplicar en staging primero
pnpm db:migrate           # 2. Aplicar (nunca en prod sin revisión)
```

Nunca uses `drizzle-kit push` — siempre genera y revisa el SQL primero.

## Convenciones de nombres

- Componentes React: PascalCase en `src/components/`
- Server Actions: camelCase en `src/actions/` (sin sufijo `.action.ts`)
- API Routes: kebab-case en la URL, handler en `route.ts`
- Hooks: prefijo `use` en `src/hooks/`
- Stores Zustand: sufijo `Store` en `src/store/`
- DB Queries: funciones en `src/db/queries/`
