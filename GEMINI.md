# GEMINI.md — Antigravity IDE Overrides
# GM App · Next.js 15 · Heritage Editorial DS
# Este archivo complementa AGENTS.md — no lo contradice.
# AGENTS.md contiene las reglas absolutas del stack. Este archivo
# contiene preferencias de interfaz y comportamiento del Agent Manager.

---

## 1. Selección de Modelo por Tarea

| Tipo de Tarea | Modelo Recomendado | Deep Think |
| :--- | :--- | :--- |
| Lógica de Negocio / Checkout (`order.service.ts`) | Gemini 3.1 Pro | **ON** |
| DB Queries Complejas (`menu.ts`, `daily-menu.ts`) | Gemini 3.1 Pro | **ON** |
| Componentes UI / Estilos (`src/components/public`) | Gemini 3 Flash | OFF |
| Refactorización Mecánica / Tipos | Gemini 3 Flash | OFF |
| Research / Documentación | Claude Sonnet 4.6 | OFF |

---

## 2. Agent Manager — Paralelismo

### Nunca ejecutar en paralelo (riesgo de conflicto)
- `src/services/order.service.ts`: Concentra toda la lógica de validación de pedidos.
- `src/db/schema/*`: Cualquier cambio en el schema afecta a todo el árbol de queries.
- `src/hooks/useCartCalculation.ts`: Motor de precios central en el cliente.
- `src/lib/payment-providers/*`: Riesgo de inconsistencia en flujos financieros.

### Seguro para agentes en paralelo
- `src/components/ui/*`: Primitivos atómicos independientes.
- `src/types/*`: Mientras sean extensiones y no modificaciones de base.
- `src/app/globals.css`: Cambios visuales de variables CSS.

### Artifact Review Policy
- Activar `request_feedback = true` en planes que afecten a `src/services/` o `src/db/`.

---

## 3. Mapa de Criticidad — Política de Revisión

### 🔴 Requiere revisión manual SIEMPRE (nunca auto-apply)
- `src/lib/money.ts` & `src/lib/utils/calculate-surcharges.ts`: Cálculos de dinero/tarifas.
- `src/services/order.service.ts` & `src/actions/checkout.ts`: Flujo financiero core.
- `src/db/schema/`: Cualquier alteración de tablas.
- `src/lib/auth.ts` & `middleware.ts`: Reglas de acceso.

### 🟡 Requiere revisión si el diff toca lógica de negocio
- `src/actions/*.ts`: Flujos de Server Actions.
- `src/db/queries/*.ts`: Cambios en filtros o joins.
- `src/lib/validations/*.ts`: Esquemas de Valibot.

### 🟢 Auto-apply permitido
- Componentes en `src/components/ui/`.
- Utils de formato en `src/lib/utils.ts`.
- Estilos en `globals.css` y variables de Tailwind.

---

## 4. Contexto de Negocio para el Agente

App de pedidos para restaurante (MVP) operando bajo condiciones de economía venezolana:
- **Dual-currency**: Precios en USD (cents) pero transacciones finales mayormente en Bs.
- **BCV Rate**: Dependencia crítica de la tasa oficial del día (`getActiveRate`).
- **WhatsApp First**: Canal principal de notificaciones y verificación de pagos manuales.
- **Timezone**: `America/Caracas` es obligatorio para el ciclo de vida del menú diario.

---

## 5. Workflows — Comandos /

- `/verify-money`: Auditoría de archivos buscando uso de `float` o `Number` para dinero.
- `/db-migrate`: Flujo Drizzle: `pnpm drizzle-kit generate` -> Revisión -> `apply_migration` (Supabase MCP).
- `/checkout-audit`: Verifica consistencia de precios entre `useCartCalculation` y `order.service.ts`.
- `/ui-sync`: Asegura consistencia visual entre `Modern` y `Classic` en `ItemDetailModal`.
- `/check-availability`: Valida lógica de pools de adicionales/bebidas en el menú del día.

---

## 6. Reglas de Sesión

- **Terminal**: Usar `pnpm` explícitamente en todos los comandos; nunca `npm` o `yarn`.
- **Logging**: Prohibido `console.log`. Usar `logger` de `@/lib/logger` con contexto adecuado.
- **Errors**: No ignorar errores de Turbopack; leer el stacktrace antes de proponer cambios.
- **Validation**: Nunca inferir tipos manualmente; usar siempre `v.InferOutput<typeof schema>`.
- **Drizzle**: Las migraciones se generan localmente pero se aplican vía herramienta MCP de Supabase.
