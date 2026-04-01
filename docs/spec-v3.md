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
│       ├── payment-confirm/
│       │   └── route.ts                 # POST — confirma pago via provider activo
│       ├── payment-webhook/
│       │   └── route.ts                 # POST — webhook providers pasivos (C2P, BNC)
│       └── admin/orders/[id]/confirm-manual/
│           └── route.ts                 # POST — confirmación manual (WhatsApp)
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
│   ├── supabase-image-loader.ts
│   ├── payment-providers/               # Sistema de providers de pago
│   │   ├── types.ts                     # Interfaz PaymentProvider + tipos compartidos
│   │   ├── factory.ts                   # getActiveProvider(settings) → PaymentProvider
│   │   ├── banesco-reference.ts         # Provider MVP: validación por referencia
│   │   ├── mercantil-c2p.ts             # Provider C2P Mercantil
│   │   ├── bnc-feed.ts                  # Provider BNC feed directo
│   │   └── whatsapp-manual.ts           # Provider fallback manual
│   ├── validations/
│   │   ├── checkout.ts
│   │   ├── payment-confirm.ts           # Schema Valibot para /api/payment-confirm
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
| `price_usd_cents` | `integer` | NOT NULL, CHECK > 0 | USD 3,10 = `310`. Precio en centavos de dólar |
| `category_id` | `uuid` | NOT NULL, FK → `categories.id` | |
| `is_available` | `boolean` | NOT NULL, default `true` | |
| `image_url` | `text` | — | URL pública del objeto en Supabase Storage |
| `sort_order` | `integer` | NOT NULL, default `0` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

### Tabla: `option_groups`

Grupos de personalización por item de menú (contorno, adicionales, etc.).

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `menu_item_id` | `uuid` | NOT NULL, FK → `menu_items.id` ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Ej. "Elige tu contorno" |
| `type` | `text` | NOT NULL, CHECK IN ('radio','checkbox') | `radio` = elegir uno, `checkbox` = elegir varios |
| `required` | `boolean` | NOT NULL, default `false` | Si `true`, el botón "Agregar" permanece disabled hasta que el cliente elija |
| `sort_order` | `integer` | NOT NULL, default `0` | |

### Tabla: `options`

Opciones individuales dentro de cada grupo.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `group_id` | `uuid` | NOT NULL, FK → `option_groups.id` ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Ej. "Arroz blanco", "Papas fritas" |
| `price_usd_cents` | `integer` | NOT NULL, default `0` | `0` = incluido en el precio base |
| `is_available` | `boolean` | NOT NULL, default `true` | |
| `sort_order` | `integer` | NOT NULL, default `0` | |

### Tabla: `exchange_rates`

Registro histórico de tasas BCV. Solo se inserta, nunca se modifica.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `rate_bs_per_usd` | `numeric(18,8)` | NOT NULL | Ej. `451.50720000` |
| `valid_date` | `date` | NOT NULL | Fecha de vigencia de la tasa |
| `fetched_at` | `timestamptz` | NOT NULL, default `now()` | |
| `source` | `text` | NOT NULL, default `'bcv_official'` | |

### Tabla: `orders`

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `customer_phone` | `text` | NOT NULL | Validado por regex venezolano |
| `items_snapshot` | `jsonb` | NOT NULL | Inmutable. Ver estructura completa abajo |
| `subtotal_usd_cents` | `integer` | NOT NULL | Suma de items en centavos USD |
| `subtotal_bs_cents` | `integer` | NOT NULL | Monto real a cobrar — sin trucos de céntimos |
| `status` | `text` | NOT NULL | `pending \| paid \| kitchen \| delivered \| expired \| failed \| whatsapp` |
| `payment_method` | `text` | NOT NULL | `pago_movil \| transfer \| whatsapp \| cash \| pos` |
| `payment_provider` | `text` | NOT NULL | Provider que procesó/procesa este pago. Ver sección 7.4 |
| `payment_reference` | `text` | — | Referencia bancaria confirmada por el provider |
| `payment_log_id` | `uuid` | FK → `payments_log.id` | — |
| `exchange_rate_id` | `uuid` | NOT NULL, FK → `exchange_rates.id` | Tasa usada al crear la orden |
| `rate_snapshot_bs_per_usd` | `numeric(18,8)` | NOT NULL | Copia inmutable de la tasa — no depende del FK |
| `expires_at` | `timestamptz` | NOT NULL | `created_at + settings.order_expiration_minutes` |
| `order_mode` | `text` | NOT NULL, default `'external'` | `external \| dine_in \| takeaway \| delivery` — **v2 preparado** |
| `table_id` | `uuid` | — | FK → `tables.id` — **v2 preparado** |
| `delivery_address` | `text` | — | **v2 preparado** |
| `delivery_address_refs` | `text` | — | **v2 preparado** |
| `delivery_coords` | `jsonb` | — | `{lat, lng}` — **v2 preparado** |
| `delivery_zone_id` | `uuid` | — | FK → `delivery_zones.id` — **v2 preparado** |
| `delivery_cost_usd_cents` | `integer` | NOT NULL, default `0` | **v2 preparado** |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Nota sobre el monto de cobro:** `subtotal_bs_cents` es el monto exacto y limpio que el cliente debe transferir. No hay céntimos adicionales, no hay trucos de identificación por monto. La identificación de la orden la hace el provider a través de otros mecanismos (referencia bancaria, notificación directa del banco, o número de teléfono + timestamp).

**Estructura del `items_snapshot`:**
```jsonc
[{
  "id": "uuid",
  "name": "Pollo Guisado",
  "price_usd_cents": 310,
  "price_bs_cents": 139967,
  "selected_contorno": { "id": "uuid", "name": "Ensalada" },
  "selected_adicionales": [
    { "id": "uuid", "name": "Papas fritas", "price_usd_cents": 200, "price_bs_cents": 90302 }
  ],
  "quantity": 1,
  "item_total_bs_cents": 230269
}]
```

### Tabla: `payments_log`

Registro inmutable de toda confirmación de pago, independientemente del provider. Solo se inserta, nunca se actualiza.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `order_id` | `uuid` | NOT NULL, FK → `orders.id` | |
| `provider_id` | `text` | NOT NULL | `banesco_reference \| mercantil_c2p \| bnc_feed \| whatsapp_manual` |
| `amount_bs_cents` | `integer` | NOT NULL | Monto verificado por el provider × 100 |
| `reference` | `text` | UNIQUE | Referencia bancaria (nullable para providers que no la usan) |
| `sender_phone` | `text` | — | Teléfono del pagador si lo provee el provider |
| `provider_raw` | `jsonb` | NOT NULL | Respuesta cruda del provider para auditoría completa |
| `outcome` | `text` | NOT NULL | `confirmed \| rejected \| manual` |
| `confirmed_by` | `uuid` | — | FK → `users.id` si fue confirmación manual por un admin |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### Tabla: `settings`

Un único row. Se inicializa con una migración seed y nunca se borra.

| Columna | Tipo SQL | Restricciones | Notas |
|---|---|---|---|
| `id` | `integer` | PK, always = `1` | Garantiza singleton |
| `bank_name` | `text` | NOT NULL | Nombre del banco destino (mostrado al cliente) |
| `bank_code` | `text` | NOT NULL | Código de banco Ej. `0134` |
| `account_phone` | `text` | NOT NULL | Teléfono de la cuenta destino |
| `account_rif` | `text` | NOT NULL | RIF o cédula |
| `whatsapp_number` | `text` | NOT NULL | Número para modo WhatsApp. Ej. `584141234567` |
| `order_expiration_minutes` | `integer` | NOT NULL, default `30` | |
| `max_pending_orders` | `integer` | NOT NULL, default `99` | |
| `current_rate_id` | `uuid` | FK → `exchange_rates.id` | Tasa BCV activa |
| `rate_override_bs_per_usd` | `numeric(18,8)` | — | Si presente, tiene prioridad sobre `current_rate_id` |
| `active_payment_provider` | `text` | NOT NULL, default `'banesco_reference'` | Provider activo. Ver sección 7.4 |
| `banesco_api_key` | `text` | — | Credencial provider Banesco |
| `mercantil_client_id` | `text` | — | Credencial C2P Mercantil |
| `mercantil_client_secret` | `text` | — | Credencial C2P Mercantil |
| `bnc_api_key` | `text` | — | Credencial feed BNC |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Nota de seguridad:** las columnas de credenciales bancarias (`banesco_api_key`, `mercantil_client_secret`, `bnc_api_key`) nunca se exponen al cliente ni se incluyen en respuestas de API. Solo se leen en Server Actions del lado del servidor. En producción considerar rotarlas periódicamente.

### Tablas preparadas para v2 (crear vacías en migración inicial)

Estas tablas se crean en la migración inicial del MVP sin lógica asociada. Evitan migraciones disruptivas cuando se implementen los flujos de v2.

**`tables`** — mesas del restaurante (para flujo dine-in con QR):
```sql
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,           -- ej. "Mesa 1", "Mesa Terraza 3"
  qr_code text UNIQUE,          -- código único embebido en el QR
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**`delivery_zones`** — zonas de entrega con costo (para flujo delivery):
```sql
CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- ej. "Zona Centro", "Zona Residencial"
  cost_usd_cents integer NOT NULL,       -- costo de delivery en USD cents
  description text,                      -- referencia geográfica en texto
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

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
| `paymentMethod` | select | `pago_movil` o `transfer` (el campo visible depende del provider activo) |

**Server Action `processCheckout` — flujo interno:**

```
1. Validar inputs con Valibot (phone, paymentMethod)
2. Parsear items: [{ id: string, quantity: number, selectedOptions: [...] }]
3. Consultar Drizzle: precios reales de los IDs — NUNCA usar precios del cliente
4. Verificar que todos los items existen y tienen is_available = true
5. Obtener tasa activa: settings.rate_override ?? exchangeRates[currentRateId]
6. Calcular subtotalUsdCents = suma de (price_usd_cents + opciones) × quantity
7. Calcular subtotalBsCents = usdCentsToBsCents(subtotalUsdCents, rate)
8. Leer settings.active_payment_provider
9. Construir items_snapshot inmutable
10. expiresAt = now() + order_expiration_minutes
11. Insertar orden en BD con status = 'pending'
12. Llamar provider.initiatePayment(order) → PaymentInitResult
13. Retornar { success: true, orderId, initResult }
    donde initResult dicta qué pantalla muestra el cliente
```

**Tipo de retorno discriminado:**
```typescript
type CheckoutResult =
  | { success: true; orderId: string; initResult: PaymentInitResult }
  | { success: false; error: string; field?: string }

type PaymentInitResult =
  | { screen: 'enter_reference'; totalBsCents: number; bankDetails: BankDetails }
  | { screen: 'c2p_pending'; instructions: string; expiresAt: string }
  | { screen: 'waiting_auto'; totalBsCents: number; bankDetails: BankDetails }
  | { screen: 'whatsapp'; waLink: string; prefilledMessage: string }
```

**Estados de la UI de checkout:**

```
ESTADO 1 — Formulario
  → onSubmit → Server Action → initResult determina el siguiente estado

ESTADO 2a — Ingresar referencia (provider: banesco_reference)
  → Muestra monto total limpio (Bs. X,XX sin trucos)
  → Campo para ingresar número de referencia bancaria
  → Botón "Verificar pago" → Server Action confirmPayment
  → Confirmación en < 3 segundos
  → Si válido → ESTADO 3
  → Si inválido → error inline con motivo específico

ESTADO 2b — Esperando aprobación C2P (provider: mercantil_c2p)
  → Instrucciones: "Revisa tu app de Mercantil y aprueba el cobro"
  → Polling cada 3s hasta confirmación del banco
  → Si confirmado → ESTADO 3
  → Si expirado → ESTADO ERROR

ESTADO 2c — Esperando automático (provider: bnc_feed)
  → Muestra monto total y cuenta BNC destino
  → Polling cada 3s — la confirmación llega sola desde el feed
  → Si confirmado → ESTADO 3

ESTADO 2d — WhatsApp (provider: whatsapp_manual o fallback)
  → Botón "Abrir WhatsApp" → abre wa.me con mensaje pre-llenado
  → Pantalla de espera: "El restaurante confirmará tu pedido"
  → Polling cada 5s (el admin confirma desde el panel)

ESTADO 3 — Éxito
  → clearCart()
  → navigator.vibrate([100, 50, 200])
  → Link "Volver al menú"

ESTADO ERROR
  → Mensaje contextual con el motivo exacto del error
  → Botón para reintentar
```

### 7.4 Sistema de Payment Providers

#### Contrato de la interfaz

```typescript
// src/lib/payment-providers/types.ts

type ProviderId =
  | 'banesco_reference'
  | 'mercantil_c2p'
  | 'bnc_feed'
  | 'whatsapp_manual'

interface PaymentProvider {
  readonly id: ProviderId
  readonly mode: 'active' | 'passive'
  // activo: el cliente ingresa algo para confirmar
  // pasivo: el banco notifica automáticamente

  initiatePayment(order: Order, settings: Settings): Promise<PaymentInitResult>
  confirmPayment(input: PaymentConfirmInput): Promise<PaymentConfirmResult>
}

type PaymentConfirmInput =
  | { type: 'reference'; reference: string; orderId: string }
  | { type: 'webhook_c2p'; rawBody: string; signature: string }
  | { type: 'feed_event'; event: unknown; signature: string }
  | { type: 'manual'; adminUserId: string; orderId: string }

type PaymentConfirmResult =
  | { success: true; providerRaw: unknown; reference?: string }
  | { success: false; reason: 'invalid_reference' | 'amount_mismatch'
      | 'already_used' | 'expired' | 'api_error'; message: string }
```

#### `PaymentProviderFactory`

```typescript
// src/lib/payment-providers/factory.ts
// Un único punto de acceso. El checkout nunca instancia providers directamente.

export function getActiveProvider(settings: Settings): PaymentProvider {
  switch (settings.activePaymentProvider) {
    case 'banesco_reference': return new BanescoReferenceProvider(settings)
    case 'mercantil_c2p':     return new MercantilC2PProvider(settings)
    case 'bnc_feed':          return new BNCFeedProvider(settings)
    case 'whatsapp_manual':   return new WhatsAppManualProvider(settings)
  }
}
```

#### Provider 1 — `BanescoReferenceProvider` (MVP — activo por defecto)

- `mode: 'active'`
- `initiatePayment` → retorna `screen: 'enter_reference'` con `totalBsCents` limpio
- `confirmPayment({ type: 'reference', reference, orderId })`:
  1. Consultar Banesco API con la referencia
  2. Verificar que el monto coincide con `order.subtotal_bs_cents` (tolerancia ±1 centavo por redondeo)
  3. Verificar que la referencia no esté ya en `payments_log`
  4. Si válido → UPDATE orden a `paid` + INSERT payments_log
  5. Si inválido → retornar reason específico (`invalid_reference`, `amount_mismatch`, `already_used`)
- Fallback automático: si la API de Banesco no responde en 5s → retornar `{ success: false, reason: 'api_error' }` → el checkout muestra opción de contactar por WhatsApp

**Pantalla de espera con este provider — sin polling pasivo.** La confirmación es síncrona: el cliente ingresa la referencia, toca "Verificar", recibe respuesta en < 3s. No hay estado de "esperando indefinidamente".

#### Provider 2 — `MercantilC2PProvider`

- `mode: 'passive'`
- `initiatePayment` → llama Mercantil C2P API con teléfono + monto → retorna `screen: 'c2p_pending'`
- `confirmPayment({ type: 'webhook_c2p', rawBody, signature })`:
  1. Verificar firma HMAC del webhook de Mercantil
  2. Parsear evento de débito confirmado
  3. Cruzar con la orden pendiente por `orderId` en el payload
  4. UPDATE orden a `paid` + INSERT payments_log
- Requiere: cuenta jurídica en Mercantil + afiliación al servicio C2P

#### Provider 3 — `BNCFeedProvider` (modelo Cashea)

- `mode: 'passive'`
- `initiatePayment` → retorna `screen: 'waiting_auto'` con cuenta BNC destino
- `confirmPayment({ type: 'feed_event', event, signature })`:
  1. Verificar firma del evento BNC
  2. Extraer teléfono + monto + timestamp del evento
  3. Buscar orden `pending` cuyo `customer_phone` y `subtotal_bs_cents` coincidan con el evento
  4. Si match único → UPDATE orden a `paid` + INSERT payments_log
  5. Si match múltiple o ninguno → INSERT en log de eventos sin match para revisión admin
- Requiere: cuenta jurídica en BNC + integración directa del feed de transacciones

#### Provider 4 — `WhatsAppManualProvider` (fallback — siempre disponible)

- `mode: 'active'`
- `initiatePayment` → construye mensaje formateado → retorna `screen: 'whatsapp'` con link `wa.me`
- El link `wa.me` lleva el pedido completo pre-llenado:
  ```
  🍔 *Pedido G&M*
  • 1× Pollo Guisado (Ensalada + Papas fritas) — Bs. 2.302,69
  • 1× Bistec en Salsa (Arroz) — Bs. 1.625,43
  💰 Total: *Bs. 3.928,12* (REF 8,70)
  📱 Mi teléfono: 0414-XXXXXXX
  ```
- `confirmPayment({ type: 'manual', adminUserId, orderId })`:
  1. Verificar que `adminUserId` tiene role `admin`
  2. UPDATE orden a `paid` + INSERT payments_log con `outcome: 'manual'`
- El admin confirma desde el panel: en la vista de órdenes, las órdenes `whatsapp` tienen un botón "Confirmar pago recibido"
- Este provider **nunca falla** — no depende de ninguna API externa

#### Fallback automático entre providers

Si el provider activo retorna `reason: 'api_error'` (la API bancaria no responde), el checkout muestra:
```
"No pudimos verificar tu pago automáticamente.
Puedes compartir tu referencia por WhatsApp y el equipo
de G&M la confirmará manualmente."
[Abrir WhatsApp]  [Intentar de nuevo]
```

No hay cambio automático de provider en settings — es una degradación graceful solo para esa transacción específica.

#### Cron job de expiración de órdenes

Ejecuta cada 5 minutos:

```sql
UPDATE orders SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();
```

Las órdenes `whatsapp` no expiran automáticamente — el cajero las gestiona manualmente.

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
{ "status": "pending" | "paid" | "kitchen" | "delivered" | "expired" | "failed" | "whatsapp" }
```

**Response 404:** `{ "error": "Order not found" }`

**Response 429:** `{ "error": "Too many requests" }`

---

### `POST /api/payment-confirm`

Endpoint que invoca el `confirmPayment` del provider activo cuando el cliente ingresa su referencia (provider `banesco_reference`).

**Autenticación:** Ninguna (el `orderId` actúa como token opaco de corta duración).

**Request body:**
```json
{
  "orderId": "uuid",
  "reference": "12345678"
}
```

**Response 200 — confirmado:**
```json
{ "success": true }
```

**Response 200 — rechazado (no es error HTTP — el cliente maneja el motivo):**
```json
{
  "success": false,
  "reason": "invalid_reference" | "amount_mismatch" | "already_used" | "expired" | "api_error",
  "message": "Texto legible para mostrar al cliente"
}
```

**Response 429:** `{ "error": "Too many requests" }`

---

### `POST /api/payment-webhook`

Endpoint genérico que recibe notificaciones de los providers pasivos (C2P Mercantil y BNC Feed). El provider activo determina cómo se procesa.

**Autenticación:** HMAC-SHA256 en header `X-Webhook-Signature` (secret específico por provider).

**Comportamiento:**
```
1. Leer body como string raw
2. Verificar firma HMAC según el provider activo en settings
   → 401 si falla, sin revelar detalles
3. Delegar a provider.confirmPayment({ type: 'webhook_c2p' | 'feed_event', ... })
4. Responder 200 siempre — el banco no debe reintentar por errores de negocio
```

**Response 200:** `{ "outcome": "confirmed" | "rejected" | "duplicate" }`

**Response 401:** `{ "error": "Unauthorized" }`

---

### `POST /api/admin/orders/[id]/confirm-manual`

Permite al admin confirmar manualmente una orden en modo WhatsApp.

**Autenticación:** sesión Auth.js con role `admin`.

**Response 200:** `{ "success": true }`

**Response 403:** `{ "error": "Forbidden" }`

---

### Server Action `processCheckout`

**Input:**
```typescript
{
  phone: string
  paymentMethod: 'pago_movil' | 'transfer'
  items: Array<{ id: string; quantity: number; selectedOptions?: SelectedOptions }>
}
```

**Output exitoso:**
```typescript
{
  success: true
  orderId: string
  initResult: PaymentInitResult   // dicta qué pantalla muestra la UI
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
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DATABASE_URL_DIRECT=postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres

# ─── Supabase — Storage ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-del-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-del-dashboard>

# ─── Auth.js v5 ──────────────────────────────────────────────────────────
AUTH_SECRET=cambia-esto-por-un-string-aleatorio-de-32-chars

# ─── Payment Providers ───────────────────────────────────────────────────
# Banesco Reference (provider por defecto en MVP)
BANESCO_API_KEY=

# Mercantil C2P (cuando se active)
MERCANTIL_CLIENT_ID=
MERCANTIL_CLIENT_SECRET=

# BNC Feed (modelo Cashea, cuando se active)
BNC_API_KEY=

# Webhook secret genérico para providers pasivos (C2P, BNC)
PAYMENT_WEBHOOK_SECRET=cambia-esto-por-otro-string-aleatorio

# ─── URL pública de la app ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Rate limiting (Upstash Redis) ──────────────────────────────────────
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

## 17. Hoja de Ruta v2 — Flujos Planificados

Esta sección documenta los tres flujos que se implementarán después del MVP. El schema del MVP ya incluye las columnas y tablas necesarias para no requerir migraciones disruptivas.

### Flujo A — WhatsApp como método de pago

**Descripción:** el cliente construye su pedido normalmente en la app pero en el checkout elige "Coordinar por WhatsApp" en lugar de Pago Móvil. La app genera un mensaje pre-formateado con el pedido completo y abre `wa.me` con ese texto. El humano del restaurante recibe el mensaje en WhatsApp Business y coordina el pago manualmente.

**Columnas del MVP que lo soportan:**
- `orders.payment_method`: añadir valor `'whatsapp'`
- `orders.status`: añadir valor `'whatsapp'` (orden creada pero sin conciliación automática)
- `settings.whatsapp_number`: número destino ya presente en settings

**Mensaje generado automáticamente por la app:**
```
🍔 *Nuevo pedido G&M*

📋 Detalle:
• 1× Pollo Guisado (Ensalada + Papas fritas) — Bs. 2.302,69
• 1× Bistec en Salsa (Arroz) — Bs. 1.625,43

💰 Total: *Bs. 3.928,12* (REF 8,70)
📱 Teléfono: 0414-XXXXXXX

¿Cómo deseas pagar?
□ Pago Móvil
□ Transferencia
□ Efectivo al recibir
```

**Nota sobre WhatsApp Business API vs `wa.me`:** para el MVP usar `wa.me` link (gratis, cero infraestructura). Evaluar WhatsApp Business API oficial si el volumen justifica automatización. No usar Baileys (riesgo de ban del número del negocio).

---

### Flujo B — Delivery con motorizado propio

**Descripción:** cliente externo pide desde casa. Elige modo "Delivery" antes del checkout. Ingresa dirección + referencias + GPS opcional. Elige zona de entrega (que determina el costo). Paga antes (Pago Móvil) o al recibir (efectivo/POS).

**Columnas del MVP que lo soportan:**
- `orders.order_mode = 'delivery'`
- `orders.delivery_address` — texto libre
- `orders.delivery_address_refs` — referencias del punto
- `orders.delivery_coords` — `{lat, lng}` GPS opcional
- `orders.delivery_zone_id` — FK a `delivery_zones`
- `orders.delivery_cost_usd_cents` — costo calculado según zona
- Tabla `delivery_zones` (creada vacía en MVP)

**Flujo de estados de la orden en delivery:**
```
pending → paid → kitchen → en_camino → delivered
                               ↑
                    Estado nuevo exclusivo de delivery
```

**Kitchen Display en v2:** el kanban mostrará una columna "En camino" exclusiva para delivery. Las órdenes de mesa y take away no pasan por ese estado.

**Costos de delivery:** el admin define zonas geográficas con nombre, descripción de referencia y costo en USD. El cliente selecciona su zona en el checkout. El costo se suma al subtotal antes de calcular el monto exacto de conciliación.

---

### Flujo C — Dine-in con QR por mesa

**Descripción:** comensal en el local escanea un QR físico en su mesa. El QR lleva a `tuapp.com/?table=CODIGO_MESA`. La app detecta el parámetro, identifica la mesa, y el cliente pide normalmente. Al hacer checkout puede pagar por Pago Móvil desde el teléfono o pedir la cuenta para pagar en caja (efectivo/POS).

**Columnas del MVP que lo soportan:**
- `orders.order_mode = 'dine_in'`
- `orders.table_id` — FK a `tables`
- `orders.payment_method`: añadir valores `'cash'` y `'pos'`
- Tabla `tables` (creada vacía en MVP)

**UX en v2:**
- La URL con `?table=CODIGO` se guarda en `sessionStorage` al entrar
- El checkout muestra el número de mesa: "Pedido para Mesa 3"
- Si pago digital: flujo normal de conciliación
- Si pago en caja: orden se crea con `status = 'pending_cash'`, la cocina la ve y prepara, el cajero confirma el pago manualmente desde el admin

**Kitchen Display en v2:** cada card de orden mostrará un badge de modo visible desde 2 metros: `🛵 Delivery`, `🪑 Mesa 3`, `📦 Take away`.

---

### Flujo D — Modos habilitados por el admin

**Descripción:** el admin puede activar o desactivar modos de pedido desde settings según el horario o capacidad del día.

**Configuración en settings (v2):**
```
delivery_enabled: boolean     default false
dine_in_enabled: boolean      default false
takeaway_enabled: boolean     default true
external_enabled: boolean     default true
```

Cuando un modo está desactivado, la opción no aparece en la pantalla de selección de modo del cliente. Si solo un modo está activo, se salta la pantalla de selección y se va directamente al menú.

---

## 18. Decisiones de Diseño (ADRs)

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

**Decisión:** Los endpoints de webhook de providers pasivos responden HTTP 200 tanto para pagos confirmados como rechazados. Solo responden 401 para fallo de autenticación.

**Razón:** Un 4xx/5xx invita al banco a reintentar, lo que puede producir procesamiento duplicado. Un 200 con body descriptivo confirma la recepción. Los errores de negocio se manejan con logs y alertas internas.

---

### ADR-008: Sistema de Payment Providers en lugar de céntimos dinámicos

**Decisión:** Reemplazar el mecanismo de conciliación por céntimos dinámicos con un sistema de providers de pago intercambiables, desacoplados del checkout mediante una interfaz común.

**Razón:** Los céntimos dinámicos tienen tres fallas estructurales: el cliente puede transferir mal el monto (redondeo, error tipográfico) dejando la orden sin conciliar; el sistema tiene un límite duro de 99 órdenes pendientes simultáneas; y depende de que el banco envíe un webhook exacto que el sistema pueda cruzar con el monto.

El sistema de providers resuelve esto arquitectónicamente: cada provider tiene su propio mecanismo de verificación adecuado a cómo funciona ese banco. El provider `banesco_reference` verifica la referencia que el cliente ingresa activamente. El provider `mercantil_c2p` cobra al cliente directamente sin transferencia manual. El provider `bnc_feed` replica el modelo Cashea con feed directo del banco.

El checkout llama `getActiveProvider(settings).initiatePayment()` y no sabe cómo funciona el provider internamente. Cambiar de provider es cambiar `settings.active_payment_provider` — cero cambios en el código del checkout, cero migraciones de schema.

**Trade-off aceptado:** el provider MVP (`banesco_reference`) requiere que el cliente ingrese activamente su número de referencia — un paso extra respecto al modelo pasivo ideal. Es un trade-off consciente: la robustez y ausencia de errores de conciliación vale más que eliminar ese paso. Los providers pasivos (C2P, BNC Feed) eliminan ese paso cuando estén disponibles.

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
