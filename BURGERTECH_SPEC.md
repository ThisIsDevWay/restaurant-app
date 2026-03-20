# BurgerTech — Especificación Técnica Completa

> Documento de referencia para el desarrollo profesional de la aplicación desde cero.
> Versión 2.0 — Marzo 2026 — Stack 100% custom, sin Payload CMS

---

## Tabla de Contenidos

1. [Visión General del Producto](#1-visión-general-del-producto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Base de Datos y Schema (Drizzle ORM)](#5-base-de-datos-y-schema-drizzle-orm)
6. [Autenticación y Autorización (Auth.js v5)](#6-autenticación-y-autorización-authjs-v5)
7. [Módulos de la Aplicación](#7-módulos-de-la-aplicación)
   - 7.1 [Menú público](#71-menú-público)
   - 7.2 [Carrito de compras](#72-carrito-de-compras)
   - 7.3 [Checkout y generación de orden](#73-checkout-y-generación-de-orden)
   - 7.4 [Flujo de pago y conciliación](#74-flujo-de-pago-y-conciliación)
   - 7.5 [Panel de administración (Admin custom)](#75-panel-de-administración-admin-custom)
   - 7.6 [Panel de cocina (Kitchen Display)](#76-panel-de-cocina-kitchen-display)
8. [Seguridad](#8-seguridad)
9. [API — Contratos y Endpoints](#9-api--contratos-y-endpoints)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [PWA e Instalabilidad](#11-pwa-e-instalabilidad)
12. [Estrategia de Caché y Performance](#12-estrategia-de-caché-y-performance)
13. [Manejo de Errores y Observabilidad](#13-manejo-de-errores-y-observabilidad)
14. [Testing](#14-testing)
15. [CI/CD y Deployment](#15-cicd-y-deployment)
16. [Plan de Implementación por Fases](#16-plan-de-implementación-por-fases)
17. [Decisiones de Diseño (ADRs)](#17-decisiones-de-diseño-adrs)

---

## 1. Visión General del Producto

**BurgerTech** es una Progressive Web App (PWA) de punto de venta diseñada para restaurantes en Venezuela. Permite a los clientes hacer pedidos directamente desde su teléfono, pagar mediante Pago Móvil o transferencia bancaria, y recibir confirmación en tiempo real cuando el pago es conciliado.

### Actores del sistema

| Actor | Descripción |
|---|---|
| **Cliente** | Usuario final que navega el menú, agrega al carrito y paga |
| **Administrador** | Gestiona el menú, ve órdenes y dashboard, configura la cuenta bancaria |
| **Cocina** | Vista de pantalla con órdenes activas (solo lectura) |
| **Sistema bancario** | Servicio externo que envía webhooks al confirmar un pago |

### Flujo de negocio principal

```
Cliente ve menú → Agrega items → Checkout →
Sistema genera orden + monto exacto con céntimos únicos →
Cliente transfiere exactamente ese monto →
Banco notifica webhook → Sistema concilia →
Orden marcada como "pagada" → Cliente ve confirmación →
Cocina ve la orden
```

### Mecanismo de conciliación por céntimos dinámicos

Dado que los bancos venezolanos no siempre proveen un identificador único por transacción, cada orden recibe un **monto exacto único** calculado como:

```
monto_exacto = total_orden + (céntimos_únicos / 100)
```

Los `céntimos_únicos` se asignan de forma que no haya dos órdenes pendientes con el mismo monto exacto en un mismo período de tiempo. El webhook del banco incluye el monto transferido, y el sistema lo usa para identificar unívocamente la orden correspondiente.

---

## 2. Stack Tecnológico

### Versiones específicas (verificadas al 18 de marzo de 2026)

| Capa | Paquete npm | Versión | Notas |
|---|---|---|---|
| Runtime | Node.js | **22.x LTS** | Mínimo requerido por Next.js 15 y Serwist |
| Package manager | pnpm | **10.x** | Resuelve peer deps sin `--legacy-peer-deps` |
| Framework | `next` | **15.4.11** | Estable, meses de battle-testing en producción |
| React | `react` + `react-dom` | **19.2.4** | Requerido por Next.js 15.4 |
| TypeScript | `typescript` | **5.x** | `strict: true` obligatorio |
| ORM | `drizzle-orm` | **0.41.x** | Type-safe, SQL-first, sin abstracción que oculte las queries |
| Driver PostgreSQL | `postgres` (porsager) | **3.x** | Driver nativo; con Supabase Transaction Pool se usa `prepare: false` |
| Migrations CLI | `drizzle-kit` | **0.30.x** | CLI de migraciones de Drizzle |
| Base de datos | Supabase (PostgreSQL 17) | **hosted** | PostgreSQL gestionado + Storage para imágenes + CDN integrado |
| Cliente Supabase | `@supabase/supabase-js` | **2.x** | Solo para Storage — las queries de BD van por Drizzle |
| Autenticación | `next-auth` | **5.x (beta estable)** | Auth.js v5 — integración nativa con App Router |
| Estado cliente | `zustand` | **5.0.12** | Persist middleware incluido; React 19 nativo |
| Validación | `valibot` | **1.3.0** | Tree-shakeable, type-safe, sin dependencias |
| Forms admin | `react-hook-form` | **7.x** | Alto rendimiento; integración con Valibot via `@hookform/resolvers` |
| HTTP queries | `@tanstack/react-query` | **5.x** | Polling, caché, estados de carga/error |
| Tablas admin | `@tanstack/react-table` | **8.x** | Headless, composable con shadcn/ui |
| UI base | shadcn/ui | **latest** | Copy-paste components; Radix UI + Tailwind v4 |
| UI dashboard | Tremor Raw | **latest** | Copy-paste de Vercel; gráficas y métricas nativas de Tailwind v4 |
| Estilos | `tailwindcss` | **4.x** | JIT nativo; sin `tailwind.config.js` en JS |
| PostCSS | `@tailwindcss/postcss` | **4.x** | Plugin oficial Tailwind v4 |
| PWA | `@serwist/next` + `serwist` | **9.5.6** | Compatible con Next.js 15.4 sin conflictos |
| Testing unit | `vitest` | **4.x** | API compatible con Jest |
| Testing UI | `@testing-library/react` | **16.x** | Compatible React 19 |
| E2E | `@playwright/test` | **1.x** (latest) | Multi-browser, integrado con CI |

### Por qué Supabase como base de datos

Supabase provee PostgreSQL 17 gestionado con lo que este proyecto necesita en un solo lugar: la base de datos, el connection pooler (Supavisor), el almacenamiento de imágenes y su CDN. No hay que gestionar instancias, backups, ni configurar un servicio de storage separado. El plan gratuito es suficiente para desarrollo y producción temprana.

**Uso específico de Supabase en este proyecto:**
- **PostgreSQL:** accedido exclusivamente via Drizzle ORM. No se usa el cliente de Supabase ni PostgREST para queries — Drizzle da tipado completo y control total del SQL.
- **Supabase Storage:** almacenamiento de imágenes del menú. El admin genera una signed URL en un Server Action; el browser sube directamente a Storage desde el cliente, sin pasar el archivo por el servidor de Next.js.
- **Image CDN:** Supabase Storage incluye transformación de imágenes (`?width=&quality=`). Se configura un custom loader en `next.config.ts` para que `next/image` use el CDN de Supabase en lugar del optimizer propio de Next.js.

### Conexión Drizzle + Supabase: Transaction Pool

Supabase tiene dos modos de pooling. Para aplicaciones serverless como Next.js en Vercel se usa **Transaction Pool** (puerto `6543`). Este modo no soporta prepared statements, por lo que el cliente Drizzle se inicializa con `prepare: false`:

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle({ client })
```

Para migraciones (`drizzle-kit migrate`) se usa la **Direct Connection** (puerto `5432`), que sí soporta prepared statements. Se configura en `drizzle.config.ts` con una variable de entorno separada `DATABASE_URL_DIRECT`.

### Por qué Drizzle y no Prisma

Drizzle es SQL-first: el schema en TypeScript produce SQL predecible y auditable. Las migraciones son archivos SQL legibles que se versionan junto al código. No hay runtime pesado ni abstracción que genere queries inesperadas. Para un proyecto donde la precisión de las queries de conciliación es crítica (índices parciales, transacciones, comparaciones exactas de enteros), la transparencia de Drizzle es más valiosa que la conveniencia de la API de Prisma.

### Por qué shadcn/ui + Tremor Raw y no React Admin

React Admin usa React Router internamente, incompatible de forma arquitectónica con el App Router de Next.js: montarlo en la misma app convierte todo el panel en una SPA que anula Server Components y Server Actions. shadcn/ui y Tremor Raw son componentes copy-paste que el proyecto posee completamente, sin dependencias de npm, sin conflictos de design system, compatibles nativamente con Tailwind v4.

### Dependencias que NO se incluyen

- **No `framer-motion`.** Las transiciones de UI se implementan con CSS `transition` y `@keyframes` nativos. Cero dependencia, mismo resultado visual para los casos de este proyecto.
- **No `@uploadthing/react`.** Supabase Storage cubre el upload de imágenes con signed URLs. Tener UploadThing encima sería una dependencia redundante.
- **No Payload CMS ni ningún CMS headless.** El admin se construye custom sobre Next.js App Router nativo. Ver ADR-006.
- **No Prisma.** Drizzle cubre todos los casos de uso con mejor transparencia.
- **No React Admin ni MUI.** Incompatibles con Next.js App Router de forma no trivial.
- **No Docker Compose para la BD.** Supabase reemplaza el PostgreSQL local. En desarrollo se usa el proyecto de Supabase directamente (plan gratuito) o el CLI de Supabase para entorno local si se prefiere.
- **No `any` tipado en TypeScript.** `strict: true`, sin excepciones.
- **No `console.log` en producción.** Logger estructurado (sección 13).
- **No `--legacy-peer-deps`.** Si se necesita esa flag, hay un conflicto real que resolver.

---

## 3. Arquitectura del Sistema

### Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────┐
│                      Vercel / Cloud                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                 Next.js 15 Application                │   │
│  │                                                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │   │
│  │  │ App pública│  │ Admin panel│  │  API Routes    │   │   │
│  │  │  (cliente) │  │  /admin/*  │  │ /webhook       │   │   │
│  │  │  RSC + SW  │  │ Auth.js v5 │  │ /orders/status │   │   │
│  │  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘   │   │
│  │        │               │                  │            │   │
│  │  ┌─────▼───────────────▼──────────────────▼────────┐   │   │
│  │  │              Server Actions                     │   │   │
│  │  │  processCheckout · updateMenuItem · updateOrder │   │   │
│  │  └──────────────────────┬──────────────────────────┘   │   │
│  │                         │                              │   │
│  │  ┌──────────────────────▼──────────────────────────┐   │   │
│  │  │              Drizzle ORM                        │   │   │
│  │  │     Type-safe queries · Transactions · Índices  │   │   │
│  │  └──────────────────────┬──────────────────────────┘   │   │
│  │                         │                              │   │
│  └─────────────────────────┼──────────────────────────────┘   │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────┐
          │              Supabase                   │
          │                                         │
          │  ┌────────────────┐  ┌───────────────┐  │
          │  │  PostgreSQL 17 │  │    Storage    │  │
          │  │  (Transaction  │  │  (imágenes    │  │
          │  │   Pool :6543)  │  │   del menú)   │  │
          │  └────────────────┘  └───────────────┘  │
          └─────────────────────────────────────────┘
                    ▲                    ▲
                    │ HTTPS              │ Upload directo
               ┌────┴────┐         ┌────┴────┐        ┌──────────────┐
               │ Cliente │         │ Browser │         │   Banco /   │
               │  (PWA)  │         │ (admin) │         │  Proveedor  │
               └─────────┘         └─────────┘         └──────────────┘
                                                              │ Webhook POST (HMAC)
                                                              ▼
                                                     Next.js /api/payment-webhook
```

### Separación de responsabilidades

- **Server Components (RSC):** fetching del menú, tablas del admin, dashboard — rendering en servidor, sin JS extra al cliente.
- **Client Components:** carrito, checkout form, polling, gráficas interactivas, formularios del admin.
- **Server Actions:** toda mutación de datos — checkout, CRUD del menú, actualización de órdenes, configuración bancaria. Nunca lógica de negocio en el cliente.
- **Route Handlers (API):** solo webhook y status de orden. Usan Route Handlers porque necesitan control total sobre headers HTTP (verificación HMAC, rate limiting).
- **Drizzle ORM:** acceso a datos. Todas las queries viven en `src/db/queries/`. Los Server Actions importan las queries, nunca acceden directamente al driver.
- **Auth.js v5:** sesiones JWT para admin y cocina. El middleware de Next.js protege `/admin/*` y `/kitchen`.

---

## 4. Estructura del Proyecto

```
src/
├── app/
│   ├── (public)/                        # Grupo de rutas del cliente final
│   │   ├── page.tsx                     # Menú principal (RSC + ISR)
│   │   ├── checkout/
│   │   │   └── page.tsx                 # Checkout (Client Component)
│   │   └── layout.tsx                   # Layout público (QueryProvider, etc.)
│   │
│   ├── (admin)/                         # Grupo de rutas del panel de administración
│   │   ├── layout.tsx                   # Layout admin: sidebar, header, Auth guard
│   │   ├── admin/
│   │   │   ├── page.tsx                 # Dashboard: métricas + gráficas (Tremor Raw)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx             # Lista de órdenes (TanStack Table + RSC)
│   │   │   │   └── [id]/page.tsx        # Detalle de orden
│   │   │   ├── menu/
│   │   │   │   ├── page.tsx             # Lista de items del menú
│   │   │   │   ├── new/page.tsx         # Formulario nuevo item
│   │   │   │   └── [id]/edit/page.tsx   # Formulario editar item
│   │   │   ├── categories/
│   │   │   │   └── page.tsx             # CRUD de categorías
│   │   │   └── settings/
│   │   │       └── page.tsx             # Datos bancarios + configuración
│   │   └── login/
│   │       └── page.tsx                 # Página de login (Auth.js)
│   │
│   ├── (kitchen)/                       # Grupo de rutas para cocina
│   │   ├── layout.tsx                   # Layout minimalista, Auth guard (role: kitchen)
│   │   └── kitchen/
│   │       └── page.tsx                 # Kitchen Display con polling
│   │
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts                 # Auth.js handler
│       ├── orders/[id]/status/
│       │   └── route.ts                 # GET — estado de una orden
│       └── payment-webhook/
│           └── route.ts                 # POST — webhook del banco (HMAC)
│
├── actions/                             # Server Actions — toda mutación de datos
│   ├── checkout.ts                      # processCheckout
│   ├── orders.ts                        # updateOrderStatus
│   ├── menu.ts                          # createMenuItem, updateMenuItem, deleteMenuItem
│   ├── categories.ts                    # CRUD de categorías
│   └── settings.ts                      # updateBankSettings
│
├── db/
│   ├── index.ts                         # Instancia singleton del cliente Drizzle
│   ├── schema/
│   │   ├── index.ts                     # Re-export de todo el schema
│   │   ├── users.ts
│   │   ├── menu.ts
│   │   ├── categories.ts
│   │   ├── orders.ts
│   │   ├── payments-log.ts
│   │   └── settings.ts
│   ├── queries/                         # Funciones de acceso a datos (importadas por los actions)
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── payments-log.ts
│   │   └── settings.ts
│   └── migrations/                      # Archivos SQL generados por drizzle-kit (se comitean)
│
├── components/
│   ├── public/                          # Componentes de la app del cliente
│   │   ├── menu/
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── MenuItemCard.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── cart/
│   │   │   ├── Cart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   └── CartButton.tsx
│   │   └── checkout/
│   │       ├── CheckoutForm.tsx
│   │       ├── PaymentDetails.tsx
│   │       └── PaymentSuccess.tsx
│   │
│   ├── admin/                           # Componentes del panel de administración
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── NavItem.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx           # Tremor Raw: tarjetas de métricas
│   │   │   ├── RevenueChart.tsx         # Tremor Raw: gráfica de ingresos por día
│   │   │   └── OrdersStatusChart.tsx    # Tremor Raw: distribución de estados
│   │   ├── orders/
│   │   │   ├── OrdersTable.tsx          # TanStack Table con paginación server-side
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   └── OrderDetailCard.tsx
│   │   ├── menu/
│   │   │   ├── MenuTable.tsx            # TanStack Table
│   │   │   └── MenuItemForm.tsx         # React Hook Form + Valibot
│   │   └── settings/
│   │       └── BankSettingsForm.tsx
│   │
│   ├── kitchen/
│   │   ├── KitchenQueue.tsx
│   │   └── OrderCard.tsx
│   │
│   └── ui/                              # shadcn/ui — componentes copy-paste (no se editan)
│       ├── button.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ...
│
├── hooks/
│   ├── usePaymentPolling.ts
│   └── useKitchenOrders.ts
│
├── lib/
│   ├── auth.ts                          # Configuración de Auth.js v5
│   ├── supabase.ts                      # Cliente Supabase (solo para Storage)
│   ├── validations/
│   │   ├── checkout.ts
│   │   ├── webhook.ts
│   │   ├── menu-item.ts
│   │   └── settings.ts
│   ├── crypto.ts                        # Verificación HMAC del webhook
│   ├── money.ts                         # Aritmética de dinero con enteros
│   └── logger.ts                        # Logger estructurado
│
├── middleware.ts                         # Protección de rutas /admin/* y /kitchen
│
├── providers/
│   └── QueryProvider.tsx
│
└── store/
    └── cartStore.ts

public/
├── manifest.json
├── icons/
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── sw.js                                # Generado por Serwist

tests/
├── unit/
│   ├── lib/money.test.ts
│   ├── lib/crypto.test.ts
│   └── actions/checkout.test.ts
├── integration/
│   ├── api/payment-webhook.test.ts
│   └── actions/menu.test.ts
└── e2e/
    ├── menu.spec.ts
    ├── checkout-flow.spec.ts
    └── admin-orders.spec.ts

drizzle.config.ts                        # Configuración de drizzle-kit
.env.local                               # NO comitear
.env.example                             # Sí comitear
```

---

## 5. Base de Datos y Schema (Drizzle ORM)

### Principio general

El schema se define en TypeScript con Drizzle en `src/db/schema/`. `drizzle-kit` genera los archivos SQL de migración en `src/db/migrations/`. Cada migración es un archivo SQL legible que se comitea al repositorio. Nunca editar migraciones ya aplicadas en producción.

Supabase expone **dos URLs de conexión** con roles distintos:

| URL | Puerto | Uso | `prepare` |
|---|---|---|---|
| `DATABASE_URL` (Transaction Pool) | `6543` | Queries de la app en Vercel (serverless) | `false` — obligatorio |
| `DATABASE_URL_DIRECT` (Direct Connection) | `5432` | Migraciones con `drizzle-kit migrate` | `true` (default) |

El `drizzle.config.ts` usa `DATABASE_URL_DIRECT`. El `src/db/index.ts` usa `DATABASE_URL` con `prepare: false`.

```bash
pnpm drizzle-kit generate   # genera nueva migración a partir de cambios en el schema
pnpm drizzle-kit migrate    # aplica migraciones (usa DATABASE_URL_DIRECT)
pnpm drizzle-kit studio     # UI visual del schema (solo desarrollo)
```

### Tabla: `users`

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `email` | `text` | NOT NULL, UNIQUE | |
| `password_hash` | `text` | NOT NULL | Bcrypt cost ≥ 12, nunca texto plano |
| `role` | `text` | NOT NULL, CHECK IN ('admin','kitchen') | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### Tabla: `categories`

| Columna | Tipo SQL | Restricciones |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `sort_order` | `integer` | NOT NULL, default `0` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Tabla: `menu_items`

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `name` | `text` | NOT NULL | |
| `description` | `text` | — | |
| `price_cents` | `integer` | NOT NULL, CHECK > 0 | Bs. 15,00 = `1500`. Ver ADR-001 |
| `category_id` | `uuid` | NOT NULL, FK → `categories.id` | |
| `is_available` | `boolean` | NOT NULL, default `true` | |
| `image_url` | `text` | — | URL pública del objeto en Supabase Storage |
| `sort_order` | `integer` | NOT NULL, default `0` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

### Tabla: `orders`

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `customer_phone` | `text` | NOT NULL | Validado por regex venezolano antes de insertar |
| `items_snapshot` | `jsonb` | NOT NULL | `[{id, name, price_cents, quantity}]` — inmutable |
| `subtotal_cents` | `integer` | NOT NULL | Suma de items, calculada en el servidor |
| `dynamic_cents_surcharge` | `integer` | NOT NULL, CHECK 1–99 | Céntimos únicos asignados |
| `exact_amount_cents` | `integer` | NOT NULL | `subtotal_cents + dynamic_cents_surcharge` |
| `status` | `text` | NOT NULL | `pending \| paid \| kitchen \| delivered \| expired \| failed` |
| `payment_method` | `text` | NOT NULL | `pago_movil \| transfer` |
| `payment_reference` | `text` | — | Referencia del banco al confirmar |
| `payment_log_id` | `uuid` | FK → `payments_log.id` | — |
| `expires_at` | `timestamptz` | NOT NULL | `created_at + settings.order_expiration_minutes` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Índice parcial único — garantía a nivel de base de datos:**
```sql
CREATE UNIQUE INDEX orders_exact_amount_pending_idx
ON orders (exact_amount_cents)
WHERE status = 'pending';
```
Hace imposible a nivel de BD que existan dos órdenes pendientes con el mismo monto exacto, incluso bajo concurrencia alta.

### Tabla: `payments_log`

Registro inmutable. Solo se inserta, nunca se actualiza.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `amount_cents` | `integer` | NOT NULL | Monto recibido × 100 |
| `reference` | `text` | NOT NULL, UNIQUE | Garantiza idempotencia a nivel de BD |
| `sender_phone` | `text` | — | |
| `raw_payload` | `jsonb` | NOT NULL | Body completo del webhook para auditoría |
| `match_status` | `text` | NOT NULL | `matched \| unmatched \| duplicate` |
| `matched_order_id` | `uuid` | FK → `orders.id` | — |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### Tabla: `settings`

Un único row. Se inicializa con una migración seed y nunca se borra.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `integer` | PK, always = `1` | Garantiza singleton |
| `bank_name` | `text` | NOT NULL | |
| `bank_code` | `text` | NOT NULL | Ej. `0134` |
| `account_phone` | `text` | NOT NULL | |
| `account_rif` | `text` | NOT NULL | |
| `order_expiration_minutes` | `integer` | NOT NULL, default `30` | |
| `max_pending_orders` | `integer` | NOT NULL, default `99` | Máx. órdenes simultáneas |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

---

## 6. Autenticación y Autorización (Auth.js v5)

### Usuarios del sistema

No hay autenticación para clientes finales. Solo acceden con credenciales los usuarios con rol `admin` (panel completo) o `kitchen` (solo Kitchen Display).

### Configuración de Auth.js v5

Se configura en `src/lib/auth.ts` con el provider **Credentials** (email + contraseña bcrypt almacenada en tabla `users`). Auth.js v5 en App Router usa sesiones **JWT** por defecto, sin tabla de sesiones en BD. El rol del usuario se incluye en el JWT y se lee desde `auth()` en Server Components y Server Actions.

```
Flujo de login:
1. Usuario envía email + password al form de /login
2. Server Action valida con Valibot
3. Auth.js Credentials provider:
   a. Consulta Drizzle: busca usuario por email
   b. Compara password con bcrypt.compare()
   c. Si válido, retorna { id, email, role }
4. Auth.js firma el JWT con AUTH_SECRET e incluye el role
5. Redirige al dashboard
```

### Protección de rutas — middleware

`src/middleware.ts` intercepta todas las peticiones antes de que lleguen a las rutas:

```
/admin/*  → requiere sesión activa con role 'admin'
/kitchen  → requiere sesión activa con role 'admin' o 'kitchen'
/login    → si ya hay sesión activa, redirige al dashboard
Todo lo demás → público
```

### Protección de Server Actions

Cada Server Action que muta datos del admin verifica la sesión al inicio. Sin esta verificación, un usuario no autenticado podría llamar la action directamente.

```typescript
// Patrón obligatorio en todos los admin Server Actions:
const session = await auth()
if (!session || session.user.role !== 'admin') {
  return { success: false, error: 'No autorizado' }
}
```

### Helpers de autorización reutilizables

```typescript
// src/lib/auth.ts
export const requireAdmin = async () => {
  const session = await auth()
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export const requireKitchenOrAdmin = async () => {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  if (!['admin', 'kitchen'].includes(session.user.role)) throw new Error('Forbidden')
  return session
}
```

---

## 7. Módulos de la Aplicación

### 7.1 Menú público

**Ruta:** `/`

**Rendering:** React Server Component con ISR. `revalidate = 60`. Revalidación on-demand desde los Server Actions del admin: al crear, editar o eliminar un item, el action llama `revalidatePath('/')`.

**Comportamiento:**
- Carga items con `is_available = true` agrupados por categoría, ordenados por `sort_order`.
- Cada card muestra: imagen (`next/image`), nombre, descripción, precio con `formatPrice()`.
- Filtro por categoría en el cliente (filtra el array cargado, sin re-fetch al servidor).
- El botón "Agregar" escribe en el `cartStore` de Zustand.

**Performance:**
- `priority={true}` en la imagen del primer item visible (mejora LCP).
- `sizes` correcto en cada `<Image>` según breakpoint real del componente.
- Custom image loader de Supabase en `next.config.ts`: las imágenes se sirven a través del CDN de Supabase con transformaciones automáticas (`?width=&quality=`), sin pasar por el optimizer de Next.js.

### 7.2 Carrito de compras

**Persistencia:** Zustand + `persist` middleware en `localStorage`.

**Tipos:**
```typescript
interface CartItem {
  id: string
  name: string
  priceCents: number     // entero, nunca decimal
  quantity: number
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}
```

**Invariantes:**
- `quantity` siempre ≥ 1. `updateQuantity(id, 0)` elimina el item.
- No puede haber dos items con el mismo `id`.
- `priceCents` es entero. Los cálculos de total se hacen con enteros; solo se convierten a decimal para mostrar.

**Hydration:** `<Cart>` usa `mounted` state para evitar hydration mismatch entre SSR y `localStorage`.

### 7.3 Checkout y generación de orden

**Ruta:** `/checkout` (Client Component)

**Campos del formulario:**

| Campo | Tipo | Validación |
|---|---|---|
| `phone` | tel | Regex: `^(0414\|0424\|0412\|0416\|0426)\d{7}$` |
| `paymentMethod` | select | `pago_movil` o `transfer` |

**Server Action `processCheckout` — flujo interno:**

```
1. Validar inputs con Valibot (phone, paymentMethod)
2. Parsear items: [{ id: string, quantity: number }]
3. Consultar Drizzle: obtener price_cents reales de esos IDs
   → NUNCA usar precios enviados por el cliente
4. Verificar que todos los items existen y tienen is_available = true
5. Calcular subtotalCents = suma de (price_cents × quantity)
6. Leer settings de BD (con caché en memoria de 5 minutos)
7. Verificar que órdenes pendientes actuales < max_pending_orders
8. Asignar céntimos únicos:
   a. Consultar exact_amount_cents de todas las órdenes con status = 'pending'
   b. Generar un entero de 1–99 que no esté entre los ya usados
   c. Si todos 99 están en uso → error: "demasiados pedidos pendientes"
9. exactAmountCents = subtotalCents + dynamicCentsSurcharge
10. Construir items_snapshot: JSON inmutable con {id, name, price_cents, quantity}
11. expiresAt = now() + order_expiration_minutes
12. Iniciar transacción Drizzle:
    a. INSERT INTO orders (...)
    b. Si falla por violación del índice único (race condition), reintentar hasta 3 veces
    c. Commit
13. Retornar { success: true, orderId, exactAmountCents, bankDetails }
    donde bankDetails proviene de settings, nunca de código hardcodeado
```

**Tipo de retorno discriminado:**
```typescript
type CheckoutResult =
  | { success: true; orderId: string; exactAmountCents: number; bankDetails: BankDetails }
  | { success: false; error: string; field?: string }
```

**Estados de la UI de checkout:**

```
ESTADO 1 — Formulario
  → onSubmit → Server Action

ESTADO 2 — Esperando pago
  → Muestra exactAmountCents formateado (Bs. X,XX) + datos bancarios
  → usePaymentPolling activo cada 3s
  → status === 'paid'    → ESTADO 3
  → status === 'expired' → ESTADO ERROR con opción de reintentar

ESTADO 3 — Éxito
  → clearCart()
  → navigator.vibrate([100, 50, 100]) si disponible
  → Link "Volver al menú"

ESTADO ERROR
  → Mensaje contextual
  → Botón para reintentar (resetea a ESTADO 1)
```

### 7.4 Flujo de pago y conciliación

#### `GET /api/orders/[id]/status`

- Sin autenticación. El UUID de la orden actúa como token opaco.
- Solo retorna `{ status }`, nunca datos del cliente.
- Rate limit: 30 requests/minuto por IP.

#### `POST /api/payment-webhook`

```
1. Leer body como string raw (la firma HMAC se verifica sobre el string original)
2. Verificar firma HMAC-SHA256 del header X-Webhook-Signature
   → Fallo: log de advertencia + 401. No revelar detalles del fallo
3. Parsear y validar body con Valibot
4. Convertir: amountCents = Math.round(amount * 100)
5. Verificar idempotencia: si ya existe en payments_log con esa reference
   → Responder 200 { status: 'duplicate' } sin procesar
6. Buscar orden: exact_amount_cents = amountCents AND status = 'pending'
   → Comparación exacta de enteros, sin punto flotante
7. Si hay match:
   a. Transacción Drizzle:
      - UPDATE orders SET status = 'paid', payment_reference = reference
      - INSERT INTO payments_log (..., match_status = 'matched', matched_order_id)
   b. Commit
8. Si no hay match:
   - INSERT INTO payments_log (..., match_status = 'unmatched')
   - Notificar al admin via logger.error (visible en Sentry)
9. Responder 200 siempre — el banco no debe reintentar por casos de negocio
```

#### Cron job de expiración de órdenes

Ejecuta cada 5 minutos (Vercel Cron o similar):

```sql
UPDATE orders SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();
```

Esto libera los céntimos dinámicos de órdenes abandonadas.

### 7.5 Panel de administración (Admin custom)

Accesible en `/admin/*`. Protegido por middleware Auth.js (rol `admin`).

#### Dashboard (`/admin`)

Construido con **Tremor Raw** sobre RSC con datos desde Drizzle.

**Fila de métricas (4 tarjetas):**
- Total de ventas del día (Bs.)
- Órdenes completadas hoy
- Órdenes pendientes en este momento
- Ticket promedio del día

**Gráfica de ingresos:**
- Barras por día, últimos 30 días
- Tremor Raw `BarChart`, datos cargados en el RSC

**Distribución de estados:**
- Donut con proporción paid / kitchen / delivered / expired del día
- Tremor Raw `DonutChart`

**Tabla de últimas órdenes:**
- Las 10 más recientes con su estado actual
- Link a la vista completa de órdenes

#### Órdenes (`/admin/orders`)

- **TanStack Table** con paginación server-side, filtro por status, filtro por fecha, ordenamiento por columna.
- Columnas: fecha, teléfono (ofuscado), resumen de items, total, método, status (badge con Select inline), acciones.
- El cambio de status dispara un Server Action.
- Página de detalle `/admin/orders/[id]` muestra el `items_snapshot` completo y el log de pago relacionado.

#### Menú (`/admin/menu`)

- Lista con TanStack Table: nombre, categoría, precio, disponibilidad (toggle), acciones.
- Formulario en `/admin/menu/new` y `/admin/menu/[id]/edit` con React Hook Form + Valibot.
- **Upload de imagen con Supabase Storage:** el Server Action genera una signed URL con `supabase.storage.from('menu').createSignedUploadUrl(path)`. El browser sube el archivo directamente a Supabase Storage usando esa URL, sin que el archivo pase por el servidor de Next.js. El Server Action luego recibe solo la URL pública resultante y la guarda en `image_url`.
- Al guardar → Server Action llama `revalidatePath('/')` para actualizar el menú público.

#### Configuración (`/admin/settings`)

- Formulario React Hook Form + Valibot con los datos bancarios.
- Advertencia visible: "Cambiar estos datos afecta los checkouts futuros. Las órdenes ya creadas tienen los datos en su snapshot y no se ven afectadas."
- Al guardar → el caché en memoria de `settings` se invalida forzando re-fetch en el próximo checkout.

### 7.6 Panel de cocina (Kitchen Display)

**Ruta:** `/kitchen` (rol `kitchen` o `admin`)

**Comportamiento:**
- Lista de órdenes con status `paid` o `kitchen`, ordenadas por `created_at` ascendente (primero en llegar, primero en atender).
- Polling cada 5 segundos con TanStack Query.
- Cada card muestra: número de orden, items con cantidades, teléfono ofuscado (últimos 4 dígitos), tiempo transcurrido, badge de status.
- Botón "En preparación" → `kitchen`. Botón "Entregado" → `delivered`. Ambos disparan Server Actions.
- Sin Framer Motion. La UI de cocina debe ser estable y no distractora.
- Touch targets ≥ 48px para uso en tabletas de cocina.

---

## 8. Seguridad

### Checklist completo

#### Inputs y validación
- [ ] Todo input del cliente validado con Valibot antes de cualquier operación.
- [ ] Precios siempre recalculados desde la BD. Nunca aceptar precios del cliente.
- [ ] IDs de items verificados en BD: deben existir y tener `is_available = true`.
- [ ] Body del webhook leído como raw string antes de parsear para verificar firma HMAC sobre el original.
- [ ] Drizzle usa prepared statements por defecto — sin riesgo de SQL injection.

#### Autenticación y autorización
- [ ] Webhook verificado con HMAC-SHA256. Secret en variable de entorno, nunca en código.
- [ ] Toda ruta `/admin/*` protegida por middleware Auth.js.
- [ ] Todo Server Action que muta datos admin verifica `session.user.role === 'admin'` al inicio.
- [ ] `/api/orders/[id]/status` retorna solo el status, nunca datos del cliente.
- [ ] Contraseñas con bcrypt (cost factor ≥ 12). Nunca texto plano.
- [ ] `AUTH_SECRET` desde variable de entorno sin fallback hardcodeado.

#### Headers de seguridad (`next.config.ts`)
```
Content-Security-Policy: default-src 'self'; img-src 'self' data: <proyecto>.supabase.co;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Rate limiting (`@upstash/ratelimit` + Upstash Redis)
- `/api/payment-webhook`: 100 requests/minuto.
- `/api/orders/[id]/status`: 30 requests/minuto por IP.
- `processCheckout` Server Action: 10 intentos/minuto por IP.

#### Datos sensibles
- Datos bancarios (RIF, teléfono, banco) leídos solo en Server Actions, nunca en endpoints públicos.
- Teléfono del cliente en Kitchen Display siempre ofuscado: `****1234`.

#### Idempotencia del webhook
- Verificar que `reference` no existe en `payments_log` antes de procesar.
- El índice `UNIQUE` en `payments_log.reference` garantiza esto a nivel de BD.

---

## 9. API — Contratos y Endpoints

### `GET /api/orders/[id]/status`

**Autenticación:** Ninguna.

**Response 200:**
```json
{ "status": "pending" | "paid" | "kitchen" | "delivered" | "expired" | "failed" }
```

**Response 404:** `{ "error": "Order not found" }`

**Response 429:** `{ "error": "Too many requests" }`

---

### `POST /api/payment-webhook`

**Autenticación:** HMAC-SHA256 en header `X-Webhook-Signature`.

**Request body:**
```json
{
  "amount": 15.03,
  "reference": "REF123456",
  "phone": "04141234567",
  "timestamp": 1700000000
}
```

> `amount` llega como decimal del banco. Primera operación: `amountCents = Math.round(amount * 100)`.

**Response 200:** `{ "status": "matched" | "unmatched" | "duplicate" }`

**Response 401:** `{ "error": "Unauthorized" }`

---

### Server Action `processCheckout`

**Input:**
```typescript
{
  phone: string
  paymentMethod: 'pago_movil' | 'transfer'
  items: Array<{ id: string; quantity: number }>
}
```

**Output exitoso:**
```typescript
{
  success: true
  orderId: string
  exactAmountCents: number       // ej: 1503 → "Bs. 15,03"
  bankDetails: {
    bankName: string
    bankCode: string
    accountPhone: string
    accountRif: string
  }
}
```

**Output con error:**
```typescript
{
  success: false
  error: string
  field?: string
}
```

---

## 10. Variables de Entorno

### `.env.example`

```bash
# ─── Supabase — Base de datos ────────────────────────────────────────────
# Transaction Pool (puerto 6543) — usado por la app en Vercel (serverless)
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# Direct Connection (puerto 5432) — usado solo por drizzle-kit migrate
DATABASE_URL_DIRECT=postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres

# ─── Supabase — Storage (imágenes del menú) ──────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-del-dashboard>
# La service_role key (solo servidor) para generar signed upload URLs
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-del-dashboard>

# ─── Auth.js v5 ──────────────────────────────────────────────────────────
AUTH_SECRET=cambia-esto-por-un-string-aleatorio-de-32-chars

# ─── Webhook del banco (firma HMAC-SHA256) ───────────────────────────────
PAYMENT_WEBHOOK_SECRET=cambia-esto-por-otro-string-aleatorio

# ─── URL pública de la app ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Rate limiting (Upstash Redis) — opcional pero recomendado ──────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── Observabilidad ──────────────────────────────────────────────────────
SENTRY_DSN=
```

### Notas sobre las variables de Supabase

- `DATABASE_URL` y `DATABASE_URL_DIRECT` se obtienen desde el dashboard de Supabase en **Project Settings → Database → Connection string**. La Transaction Pool string tiene puerto `6543`; la Direct Connection tiene puerto `5432`.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son públicas — se exponen al browser para el upload directo desde el formulario del admin.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** se expone al cliente. Se usa solo en Server Actions para generar signed upload URLs con permisos elevados.
- Las variables `NEXT_PUBLIC_*` del cliente Supabase solo se usan para Storage, no para acceder a la BD. Toda query de BD pasa por Drizzle en el servidor.

---

## 11. PWA e Instalabilidad

### Manifest (`public/manifest.json`)

```json
{
  "name": "BurgerTech",
  "short_name": "BurgerTech",
  "description": "Haz tu pedido desde aquí",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### Service Worker (Serwist 9.5.6)

| Recurso | Estrategia | TTL |
|---|---|---|
| HTML de páginas | Network-first | — |
| JS/CSS estáticos | Cache-first | 30 días |
| Imágenes del menú | Stale-while-revalidate | 7 días |
| Llamadas a `/api/*` | Network-only | — |

Las llamadas a la API nunca se cachean en el service worker.

### Offline

La app muestra el menú cacheado si el cliente está offline, pero bloquea el checkout con un mensaje claro: "Necesitas conexión a internet para realizar un pedido."

---

## 12. Estrategia de Caché y Performance

### Server-side

- **Menú `/`:** ISR `revalidate = 60`. Revalidación on-demand desde `createMenuItem`, `updateMenuItem` y `deleteMenuItem` → `revalidatePath('/')`.
- **Settings:** caché en memoria del proceso con TTL de 5 minutos. Variable módulo `let cachedSettings`. El action `updateBankSettings` la resetea a `null`.
- **Dashboard RSC:** `revalidate = 30` o `force-dynamic` según necesidad de frescura de los datos.

### Client-side (TanStack Query)

- **Order status polling:** `staleTime: 0`, `refetchInterval` condicional (detiene cuando status !== 'pending').
- **Kitchen orders:** `staleTime: 2000`, `refetchInterval: 5000`.
- **queryClient global:** `refetchOnWindowFocus: false`.

### next/image + Supabase CDN

Configurar un custom loader en `next.config.ts` que apunta al CDN de transformación de imágenes de Supabase:

```typescript
// supabase-image-loader.ts
export default function supabaseLoader({ src, width, quality }) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${src}?width=${width}&quality=${quality || 75}`
}
```

Esto permite que `next/image` sirva las imágenes del menú ya optimizadas desde el CDN de Supabase, sin consumir el quota del Image Optimizer de Vercel. Siempre especificar `sizes` apropiado al breakpoint real del componente, y `width`/`height` para evitar CLS.

---

## 13. Manejo de Errores y Observabilidad

### Logger estructurado (`src/lib/logger.ts`)

```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

logger.info('Order created', { orderId, exactAmountCents })
logger.warn('Webhook payment unmatched', { amountCents, reference })
logger.error('Webhook signature failed', { ip })
```

En desarrollo: output legible en consola. En producción: JSON estructurado enviado a Sentry / Axiom / Logtail.

### Server Actions

Nunca lanzar excepciones al cliente. Todo se captura internamente:

```typescript
try {
  // lógica principal
} catch (err) {
  logger.error('Unexpected error in processCheckout', { error: err })
  return { success: false, error: 'Error inesperado. Por favor intenta de nuevo.' }
}
```

### Route Handlers

Responder 200 para errores de negocio (el banco no debe reintentar). Solo 401 para fallo de autenticación.

### Sentry

Integrar `@sentry/nextjs`:
- Captura automática de excepciones no manejadas.
- Alertas configuradas para `match_status = 'unmatched'` (pago sin conciliar).
- Performance tracing en Server Actions críticos.

---

## 14. Testing

### Pirámide de tests

```
        /\
       /E2E\       ← 5–10 tests de flujos críticos
      /------\
     /Integr. \    ← 20–30 tests de API y Server Actions
    /----------\
   /    Unit    \  ← 50+ tests de funciones puras
  /______________\
```

### Tests unitarios obligatorios

**`tests/unit/lib/money.test.ts`**
- `formatPrice(1503)` → `"Bs. 15,03"`
- `formatPrice(1500)` → `"Bs. 15,00"`
- `totalFromItems([...])` → suma exacta en enteros sin errores de float

**`tests/unit/lib/crypto.test.ts`**
- `verifyWebhookSignature(body, validSig, secret)` → `true`
- `verifyWebhookSignature(body, invalidSig, secret)` → `false`
- Comparación en tiempo constante (no lanzar excepción si firma tiene diferente longitud)

**`tests/unit/actions/checkout.test.ts`**
- Precios recalculados desde BD (mock de Drizzle)
- Item no disponible → error
- Céntimos únicos sin colisión con órdenes existentes
- Race condition en índice único → reintento hasta 3 veces

### Tests de integración

**`tests/integration/api/payment-webhook.test.ts`**
- Firma válida + monto con match → orden `paid`, log `matched`
- Firma inválida → 401
- Referencia duplicada → 200 `{ status: 'duplicate' }` sin actualizar nada
- Monto sin match → 200 `{ status: 'unmatched' }`, log `unmatched`
- Dos webhooks con la misma referencia → idempotente

### Tests E2E (Playwright)

**`tests/e2e/checkout-flow.spec.ts`**
- Menú → carrito → checkout → pantalla de espera muestra monto con céntimos
- Carrito persiste al recargar la página

**`tests/e2e/admin-orders.spec.ts`**
- Login → lista de órdenes visible
- Cambio de status → badge actualizado

### Cobertura mínima (`vitest.config.ts`)

```
branches: 80%
functions: 80%
lines: 80%
```

---

## 15. CI/CD y Deployment

### GitHub Actions

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  lint-and-type-check:
    - pnpm run lint
    - pnpm exec tsc --noEmit

  test:
    - pnpm run test:unit
    - pnpm run test:integration
    services:
      postgres:
        image: postgres:17-alpine
        env: { POSTGRES_DB: burgertech_test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }

  e2e:
    needs: [lint-and-type-check, test]
    if: github.ref == 'refs/heads/main'
    - pnpm run test:e2e

  deploy:
    needs: [e2e]
    if: github.ref == 'refs/heads/main'
    - Vercel deploy (o plataforma elegida)
```

### Estrategia de ramas

```
main           ← producción (protegida, requiere PR + CI verde)
  └── develop  ← staging
        └── feature/xxx
        └── fix/xxx
```

### Migraciones de base de datos

Los archivos en `src/db/migrations/` se comitean al repositorio. El proceso en producción:

```bash
# Incluir como paso pre-deploy:
pnpm drizzle-kit migrate
```

Nunca editar una migración ya aplicada en producción. Crear siempre una nueva.

### Desarrollo local con Supabase

Dos opciones válidas:

**Opción A — Proyecto Supabase remoto (recomendado para equipos pequeños):**
Apuntar directamente al proyecto de Supabase desde el desarrollo local. El plan gratuito tiene suficiente capacidad. Todos los developers comparten el mismo proyecto de desarrollo.

**Opción B — Supabase CLI local (entorno completamente local):**
```bash
pnpm dlx supabase init
pnpm dlx supabase start   # levanta PostgreSQL + Storage + Studio en Docker
# Copia las variables de entorno que imprime el CLI a .env.local
pnpm drizzle-kit migrate
pnpm run db:seed
pnpm dev
```

**Inicio del proyecto desde cero (Opción A):**
```bash
# 1. Crear proyecto en supabase.com y copiar las connection strings
cp .env.example .env.local
# 2. Editar .env.local con las URLs y keys del proyecto Supabase
pnpm drizzle-kit migrate        # aplica el schema en Supabase
pnpm run db:seed                # carga datos iniciales de prueba
pnpm dev
```

---

## 16. Plan de Implementación por Fases

### Fase 1 — Infraestructura base (Semana 1)

Objetivo: schema de BD correcto, Drizzle funcionando, menú visible en el navegador.

- [ ] Crear proyecto en Supabase (plan gratuito)
- [ ] Inicializar proyecto con `create-next-app` + pnpm
- [ ] Instalar y configurar Drizzle ORM + drizzle-kit
- [ ] Configurar `DATABASE_URL` (Transaction Pool) y `DATABASE_URL_DIRECT` en `.env.local`
- [ ] Escribir schema completo: `users`, `categories`, `menu_items`, `orders`, `payments_log`, `settings`
- [ ] Crear índice parcial único de órdenes y constraints
- [ ] Primera migración con `drizzle-kit migrate` + script de seed
- [ ] Crear bucket `menu` en Supabase Storage (público para lectura)
- [ ] Configurar custom image loader de Supabase en `next.config.ts`
- [ ] Configurar Tailwind v4 + shadcn/ui (CLI init)
- [ ] Instalar componentes Tremor Raw necesarios (copy-paste)
- [ ] Página del menú público con RSC + ISR + `next/image`
- [ ] `lib/money.ts` con tests unitarios
- [ ] ESLint + TypeScript strict

**Entregable:** Menú visible en `localhost:3000` con datos del seed.

### Fase 2 — Autenticación y Admin base (Semana 2)

- [ ] Instalar y configurar Auth.js v5 con Credentials provider
- [ ] Usuario admin inicial en el script de seed
- [ ] `middleware.ts` protegiendo `/admin/*` y `/kitchen`
- [ ] Layout del admin: sidebar + header con shadcn/ui
- [ ] CRUD completo del menú con React Hook Form + Valibot
- [ ] Upload de imagen con Supabase Storage (signed URL en Server Action + upload directo desde browser)
- [ ] `lib/supabase.ts` con cliente Supabase para Storage (service_role en servidor, anon en cliente)
- [ ] CRUD de categorías
- [ ] Página de settings con formulario bancario
- [ ] Revalidación on-demand del menú público

**Entregable:** Admin funcional para gestionar el menú completo.

### Fase 3 — Carrito y Checkout (Semana 3)

- [ ] `cartStore.ts` con Zustand + persist
- [ ] Componentes del carrito (Cart, CartItem, CartButton)
- [ ] `lib/validations/checkout.ts`
- [ ] Server Action `processCheckout` con lógica de céntimos únicos
- [ ] Página de checkout con los 3 estados
- [ ] Tests unitarios de `processCheckout`

**Entregable:** Flujo completo de checkout hasta pantalla de "esperando pago".

### Fase 4 — Webhook, Seguridad y Cocina (Semana 4)

- [ ] `lib/crypto.ts` con verificación HMAC + tests
- [ ] Endpoint `POST /api/payment-webhook` con idempotencia
- [ ] Endpoint `GET /api/orders/[id]/status`
- [ ] `usePaymentPolling` hook
- [ ] Rate limiting con Upstash Redis
- [ ] Headers de seguridad en `next.config.ts`
- [ ] Cron job de expiración de órdenes
- [ ] Tests de integración del webhook
- [ ] Kitchen Display con polling + Server Actions de cambio de estado
- [ ] Middleware Auth.js para `/kitchen`

**Entregable:** Flujo de pago completo end-to-end con banco simulado.

### Fase 5 — Dashboard y Polish (Semana 5)

- [ ] Dashboard admin con métricas del día (Tremor Raw tarjetas)
- [ ] Gráfica de ingresos por día (Tremor Raw BarChart)
- [ ] Gráfica de distribución de estados (Tremor Raw DonutChart)
- [ ] Tabla de órdenes con TanStack Table (filtros, paginación server-side)
- [ ] Logger estructurado
- [ ] Integración Sentry
- [ ] Configuración PWA completa (manifest + Serwist)
- [ ] Tests E2E
- [ ] Revisar cobertura de tests

**Entregable:** Aplicación completa lista para staging.

### Fase 6 — Deploy y Monitoreo (Semana 6)

- [ ] Crear proyecto Supabase de producción (separado del de desarrollo)
- [ ] Configurar todas las variables de entorno en Vercel (producción)
- [ ] Ejecutar migraciones en producción con `DATABASE_URL_DIRECT` del proyecto de producción
- [ ] Deploy inicial
- [ ] Verificar pipeline CI/CD completo
- [ ] Smoke tests en producción
- [ ] Configurar alertas Sentry
- [ ] Documentar proceso de deploy y runbook de operaciones

---

## 17. Decisiones de Diseño (ADRs)

### ADR-001: Precios como enteros en céntimos

**Decisión:** Almacenar y calcular todos los precios como enteros en céntimos. Bs. 15,03 = `1503`.

**Razón:** `0.1 + 0.2 === 0.30000000000000004` en JavaScript. Con enteros la suma es siempre exacta. Solo se convierte a decimal para mostrar al usuario, en `formatPrice()`.

**Impacto:** Toda aritmética de dinero vive en `lib/money.ts`. El webhook convierte el amount decimal del banco con `Math.round(amount * 100)`.

---

### ADR-002: Supabase como proveedor de base de datos e imágenes

**Decisión:** Usar Supabase como proveedor del PostgreSQL gestionado y del almacenamiento de imágenes.

**Razón:** Supabase provee en un solo lugar lo que el proyecto necesita: PostgreSQL 17 con connection pooler incluido, almacenamiento de objetos (Storage) con CDN y transformación de imágenes nativa, y un plan gratuito suficiente para arrancar. No hay que gestionar instancias, configurar backups, ni añadir un servicio de storage separado. Las queries de BD siguen pasando exclusivamente por Drizzle — Supabase es solo la infraestructura, no una dependencia de lógica de aplicación.

---

### ADR-003: Snapshot inmutable de items en la orden

**Decisión:** Al crear una orden, guardar un JSON inmutable con nombre, precio y cantidad de cada item en la columna `items_snapshot`.

**Razón:** Si el admin cambia el precio de un item después de que se creó una orden, la orden histórica debe mostrar el precio que el cliente pagó. El snapshot es inmutable, sirve para auditoría y para resolver disputas.

---

### ADR-004: Datos bancarios en tabla `settings`, no en código ni env vars

**Decisión:** El banco, teléfono y RIF de la cuenta destino viven en la tabla `settings` de PostgreSQL (accedida via Drizzle).

**Razón:** Pueden cambiar sin redeploy. El administrador los actualiza desde el panel. Las variables de entorno son para secrets técnicos (tokens, claves API), no para datos de negocio cambiables.

---

### ADR-005: Webhook responde 200 siempre en casos de negocio

**Decisión:** El endpoint del webhook responde HTTP 200 tanto para pagos conciliados como no conciliados. Solo 401 para fallo de autenticación.

**Razón:** Un 4xx/5xx invita al banco a reintentar, lo que puede producir procesamiento duplicado. Un 200 con body descriptivo confirma la recepción. Los errores de negocio se manejan con logs y alertas internas.

---

### ADR-006: Stack 100% custom en lugar de Payload CMS

**Decisión:** No usar ningún CMS headless. El admin panel, la autenticación, el schema y las queries se construyen desde cero con Next.js App Router, Drizzle ORM y Auth.js v5.

**Razón:** Payload CMS demostró su riesgo durante este mismo proyecto: la ventana de incompatibilidad con Next.js 15.5–16.1.x dejó el stack sin ruta de actualización durante meses. Al construir custom, el proyecto controla completamente su stack, sus migraciones y su roadmap de actualización. El costo adicional de desarrollo se justifica con independencia total, transparencia absoluta del código y sin sorpresas de compatibilidad futuras.

**Trade-offs aceptados:** más código que escribir y mantener, admin UI inicial más básico. Mitigados con shadcn/ui (componentes copy-paste de alta calidad) y Tremor Raw (dashboard y gráficas listas para usar), y con una fase de implementación adicional (6 semanas en lugar de 5).

---

### ADR-007: Drizzle ORM en lugar de Prisma

**Decisión:** Usar Drizzle ORM como capa de acceso a datos.

**Razón:** Drizzle es SQL-first. El schema en TypeScript produce SQL predecible y auditable. Las migraciones son archivos SQL legibles que se versionan junto al código. No hay runtime pesado ni abstracción que oculte lo que se ejecuta en la BD. Para un proyecto donde la precisión de las queries de conciliación es crítica (índices parciales, transacciones, comparaciones exactas de enteros), esta transparencia es más valiosa que la conveniencia de la API de Prisma.

---

*Fin del documento. Última actualización: Marzo 2026 — Versión 2.0*
