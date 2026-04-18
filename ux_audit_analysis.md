# Análisis UX Audit — Menú Cliente Los Portillo's

**Score global: 54/100** · 4 críticos · 6 mayores · 3 menores

---

## Resumen de Dimensiones

| Dimensión | Score | Estado actual en código |
|---|---|---|
| **Viewport efficiency** | 20 🔴 | Hero fijo a `260px` en `MenuHeader.tsx` L129 |
| **Social proof** | 0 🔴 | No existe ninguna señal (ratings, badges, contadores) |
| **Estado del carrito (H1)** | 0 🔴 | `HeaderCartButton` solo vive dentro del hero — desaparece al scroll |
| **Info. arquitectura** | 55 🟡 | Categorías combinadas (e.g. "Pastas & Arroces") dependen de data del admin |
| **Touch targets** | 62 🟡 | Pills con `padding: 7px 16px` ≈ ~34px, debajo de 44pt mínimo HIG |
| **Precio legibilidad** | 60 🟡 | "Bs." a 11px con `font-bold` — aceptable pero cercano al límite |
| **Consistencia visual** | 70 🟢 | Design tokens bien centralizados en `globals.css` |
| **Fotografía de producto** | 75 🟢 | `object-cover` uniforme en `MenuItemCardModern.tsx` |

---

## Issues por Zona — Diagnóstico vs. Código Actual

### ZONA A · HERO

#### 🔴 Crítico — Hero consume 40% del viewport (~355px)
- **Código:** `MenuHeader.tsx` L129 → `height: 260` (fijo)
- **Impacto real:** En iPhone 14 (844px lógicos), 260px = **30.8%**. Sumando el top bar (60px) y pills (56px) = **376px total = 44.5% del viewport**.
- **Benchmark:** UberEats/Rappi: ≤18% hero → ≥72% menú visible
- **Diagnóstico:** Solo ~1.8 items visibles ATF (above the fold). La recomendación del audit de bajar a 18% es agresiva pero válida — un target de **≤25%** es más realista manteniendo branding.

#### 🟡 Mayor — "MENÚ DEL DÍA" con estrella decorativa
- **Código:** `MenuHeader.tsx` L266-L292 — bloque decorativo (estrella `★` + líneas gradient + "MENÚ DEL DÍA" en caps)
- **Impacto:** Ocupa ~60px verticales con cero valor funcional
- **Veredicto:** Viola Nielsen H8. Candidato a eliminación o colapso.

#### 🔴 Crítico — Ausencia de FAB de carrito persistente
- **Código:** `HeaderCartButton.tsx` vive dentro del hero overlay (L170-228 de `MenuHeader.tsx`). Al hacer scroll, desaparece.
- **Pero:** `Cart.tsx` L43 tiene un **bottom bar fijo** (`fixed bottom-0`) que aparece cuando hay items. Esto **ya resuelve parcialmente** H1.
- **Gap real:** El bottom bar solo aparece **después** de agregar el primer item. Antes de eso, no hay indicador visible al scroll.

---

### ZONA B · NAVEGACIÓN DE CATEGORÍAS

#### 🟡 Mayor — "Pastas & Arroces" doble categoría
- **Código:** Las categorías vienen de la DB (`getCategories()`). Esto es un **issue de datos del admin**, no de código frontend.
- **Acción:** Separar en el panel admin — no requiere cambios de componente.

#### 🟢 Menor — Sin fade-gradient de scroll (YA RESUELTO ✅)
- **Código:** `MenuHeader.tsx` L429-L439 — Ya tiene un `showFade` dinámico con gradient `linear-gradient(to right, transparent, #FAFAF8)`.
- **Veredicto:** El audit está **desactualizado** en este punto. Ya implementado.

#### 🟡 Mayor — Pills altura ~34px
- **Código:** `padding: 7px 16px` + `fontSize: 13` ≈ ~34px de altura total
- **Apple HIG:** 44pt mínimo. **Gap de 10px.**
- **Fix:** Cambiar a `padding: 12px 16px` → ~44px

---

### ZONA C · CARDS DE MENÚ

#### 🔴 Crítico — Cero social proof por ítem
- **Código:** `MenuItemCardModern.tsx` no tiene ningún campo de rating, contador de pedidos, ni badge "Popular".
- **Schema DB:** Probablemente no existe tabla de estadísticas por ítem.
- **Impacto:** Según Nielsen Norman (2023), social proof por ítem +31% CTR. **Issue de mayor impacto en conversión.**
- **Complejidad:** Alta — requiere tracking de pedidos por ítem + UI.

#### 🟡 Mayor — Descripción 2-line clamp
- **Código:** `MenuItemCardModern.tsx` L135 → `line-clamp-2`
- **Impacto:** Corta copy en punto de apetito visual ("y...")
- **Fix simple:** Cambiar a `line-clamp-3` (sin necesidad de "ver más")

#### 🟡 Mayor — "Bs." a ~8px
- **Código:** `MenuItemCardModern.tsx` L143 → `text-[11px] font-bold` 
- **Veredicto:** En realidad es 11px con bold, no 8px. El audit **exagera** la severidad. Actualmente es aceptable. Mejora opcional: `text-[12px] font-semibold`.

#### 🔴 Crítico — Precio USD y Bs. en mismo baseline (doble ancla)
- **Código actual:** `MenuItemCardModern.tsx` L142-157 — Ya tiene **stack vertical** con Bs. principal arriba y USD como badge pequeño abajo.
- **Veredicto:** El audit está **desactualizado** — esto **ya fue resuelto**. ✅

#### 🟢 Menor — Crop inconsistente en fotos
- **Código:** `object-cover` en `MenuItemCardModern.tsx` L103. Sin `object-position` personalizado por ítem.
- **Fix real:** Requiere campo `focal_point` en DB + UI admin. Bajo ROI.

#### 🟢 Menor — Botón "+" sin feedback de estado
- **Código:** El botón "+" (`MenuItemCardModern.tsx` L160-172) no muestra counter.
- **Pero:** El bottom bar `Cart.tsx` muestra el count total.
- **Mejora:** Transformar "+" a mostrar "2×" tras agregar. Impacto moderado.

---

## Priorización y Viabilidad

| # | Issue | Severidad | Esfuerzo | ROI | ¿Ya resuelto? |
|---|---|---|---|---|---|
| 1 | Hero consume 44% viewport | 🔴 Crítico | **Bajo** | 🔥 Alto | No |
| 2 | Estrella decorativa sin función | 🟡 Mayor | **Bajo** | Medio | No |
| 3 | FAB carrito persistente | 🔴 Crítico | **Bajo** | 🔥 Alto | **Parcial** (bottom bar existe) |
| 4 | Pills touch target <44pt | 🟡 Mayor | **Bajo** | Alto | No |
| 5 | Descripción line-clamp-2 | 🟡 Mayor | **Bajo** | Medio | No |
| 6 | Social proof por ítem | 🔴 Crítico | **Alto** | 🔥 Máximo | No |
| 7 | Categorías combinadas | 🟡 Mayor | **Admin** | Medio | Depende de data |
| 8 | Fade gradient scroll | 🟢 Menor | — | — | **✅ Ya resuelto** |
| 9 | Precio doble ancla | 🔴 Crítico | — | — | **✅ Ya resuelto** |
| 10 | "Bs." legibilidad | 🟡 Mayor | **Bajo** | Bajo | **Parcial** (11px no 8px) |
| 11 | Crop fotos | 🟢 Menor | Alto | Bajo | No |
| 12 | Botón "+" sin counter | 🟢 Menor | Medio | Bajo | No |

---

## Recomendación de Quick Wins (implementables ahora)

> [!TIP]
> Estas 4 acciones atacan los issues de mayor impacto con mínimo esfuerzo:

1. **Reducir hero:** De `260px` a `~160px` — eliminar estrella + "MENÚ DEL DÍA", compactar logo
2. **Aumentar touch targets:** Pills a `padding: 12px 16px` (→44px)
3. **Expandir descripción:** `line-clamp-2` → `line-clamp-3`
4. **Mejorar "Bs." label:** de `11px` a `12px font-semibold`

> [!IMPORTANT]
> El issue de **social proof** (ratings, "Más pedido", contadores) es el de **mayor impacto en conversión** pero requiere cambios de schema DB + lógica de tracking — es un proyecto aparte, no un quick fix.
