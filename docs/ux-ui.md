# G&M App — Especificación UX/UI

> Documento de diseño de interfaz y experiencia de usuario.
> Versión 1.0 — Marzo 2026
> Complementa a `BURGERTECH_SPEC.md` (especificación técnica).

---

## Tabla de Contenidos

1. [Contexto y Principios de Diseño](#1-contexto-y-principios-de-diseño)
2. [Identidad Visual y Sistema de Diseño](#2-identidad-visual-y-sistema-de-diseño)
3. [Componentes Base](#3-componentes-base)
4. [Flujos y Pantallas — App del Cliente](#4-flujos-y-pantallas--app-del-cliente)
   - 4.1 [Menú principal](#41-menú-principal)
   - 4.2 [Detalle de item con personalización](#42-detalle-de-item-con-personalización)
   - 4.3 [Carrito (drawer)](#43-carrito-drawer)
   - 4.4 [Checkout — formulario](#44-checkout--formulario)
   - 4.5 [Checkout — esperando pago](#45-checkout--esperando-pago)
   - 4.6 [Pantalla de éxito](#46-pantalla-de-éxito)
   - 4.7 [Pantalla de error](#47-pantalla-de-error)
   - 4.8 [Skeleton states y carga](#48-skeleton-states-y-carga)
5. [Flujos y Pantallas — Kitchen Display](#5-flujos-y-pantallas--kitchen-display)
6. [Estrategia de Precios Duales (REF + Bs.)](#6-estrategia-de-precios-duales-ref--bs)
7. [Accesibilidad y Contexto Venezolano](#7-accesibilidad-y-contexto-venezolano)
8. [Logo e Identidad de G&M](#8-logo-e-identidad-de-gm)

---

## 1. Contexto y Principios de Diseño

### El usuario tiene hambre

Este es el insight más importante del proyecto. El cliente abre la app en el peor momento cognitivo posible: tiene hambre, quiere decidir rápido, y tiene poca tolerancia a la fricción. Cada pantalla debe poder completarse en menos de 10 segundos. Cada decisión de diseño se evalúa contra esta pregunta: **¿esto ayuda al usuario a llegar más rápido a su comida?**

### Contexto venezolano — los 7 principios

**1. La pantalla de pago es la de mayor ansiedad.** El cliente transfirió dinero real antes de recibir su comida. No sabe si llegó. El diseño debe comunicar activamente que el sistema está escuchando — no una pantalla estática de "espere".

**2. Cero onboarding.** No hay cuenta de usuario. El cliente abre la app y ya está en el menú. Solo se pide el teléfono en el checkout, que es el dato mínimo para Pago Móvil. Ningún campo más.

**3. Hablar venezolano.** "Ver mi pedido", "Confirmar pedido", "REF", "Pago Móvil" — no traducción literal del inglés. Los precios siempre con el símbolo correcto: `REF` para USD, `Bs.` para bolívares.

**4. Precio prominente.** En Venezuela el precio es tan importante como el nombre del plato. Va en tipografía bold, color destacado, siempre visible en la card sin abrir el detalle.

**5. Diseño para conectividad intermitente.** Placeholder visible si la imagen no carga. Menú disponible offline desde el service worker. Skeleton states en lugar de pantallas en blanco. Botones activos incluso si hay latencia.

**6. Precios duales con transparencia.** Mostrar `REF X,XX` (USD) y `Bs. X.XXX,XX` (bolívares) juntos. El pill de tasa BCV visible en el header del menú. El cliente puede verificar la conversión mentalmente.

**7. Kitchen Display para cocina sin POS.** Una pantalla táctil o TV en cocina muestra los pedidos en tiempo real. Diseño de alto contraste, texto grande, touch targets ≥ 60px para uso con manos húmedas o guantes.

---

## 2. Identidad Visual y Sistema de Diseño

### Paleta de colores — "Tierra y Fogón"

Inspirada en la cocina casera venezolana: el calor del fogón, las especias, los colores de la tierra. Warm sin ser infantil.

#### Colores primarios

| Nombre | Hex | Uso |
|---|---|---|
| Rojo Fogón | `#8B2500` | Color principal — botones de acción, CTAs, precio REF |
| Naranja Brasa | `#D4580A` | Hover de botones, acento secundario |
| Verde Selva | `#2D6A1F` | Precios en Bs., estados de éxito, confirmación |
| Crema Cálido | `#FDF6EE` | Background de la app, superficie base |
| Marrón Profundo | `#1C1410` | Texto principal |

#### Colores de superficie

| Nombre | Hex | Uso |
|---|---|---|
| Blanco Puro | `#FFFFFF` | Cards, modales, headers |
| Arena Claro | `#F5E8D8` | Placeholder de imágenes, backgrounds de imagen |
| Gris Muted | `#8A8278` | Texto secundario, labels, subtítulos |
| Borde Suave | `#E8E0D8` | Bordes de cards y separadores |

#### Colores semánticos

| Nombre | Hex | Uso |
|---|---|---|
| Verde Éxito | `#2D6A1F` | Pago confirmado, disponible |
| Rojo Error | `#B91C1C` | Error, orden expirada, no disponible |
| Ámbar Alerta | `#92400E` | Advertencias, timer próximo a expirar |
| Azul Info | `#1E40AF` | Información neutral |

#### Escala de grises funcional

`#1C1410` → `#3D342C` → `#6B5E54` → `#8A8278` → `#B5ACA4` → `#D6CFC8` → `#E8E0D8` → `#F5EDE5` → `#FDF6EE`

---

### Tipografía

**Fuente principal: Inter**
Disponible en Google Fonts. Excelente legibilidad en pantallas pequeñas, soporte completo de caracteres latinos con tildes y ñ.

| Uso | Peso | Tamaño | Ejemplo |
|---|---|---|---|
| Precio REF (hero) | 800 ExtraBold | 22–28px | `REF 3,10` |
| Precio Bs. | 700 Bold | 14–16px | `Bs. 1.399,68` |
| Nombre de item | 600 SemiBold | 14–15px | `Pollo Guisado` |
| Descripción | 400 Regular | 12–13px | `Tierno pollo guisado...` |
| Labels y badges | 600 SemiBold | 10–11px | `OBLIGATORIO` |
| Body general | 400 Regular | 14px | Texto de párrafos |
| Precio en botón CTA | 700 Bold | 15px | `Agregar · Bs. 1.399,68` |

**Fuente de display (logo G&M): Playfair Display**
Solo para el logotipo y posibles títulos de sección decorativos. Serif elegante que evoca tradición y calidad — apropiado para un restaurante familiar.

---

### Espaciado y bordes

Sistema de 4pt base. Todo el espaciado es múltiplo de 4.

| Token | Valor | Uso típico |
|---|---|---|
| `space-1` | 4px | Espacio mínimo entre elementos inline |
| `space-2` | 8px | Padding interno de badges y pills |
| `space-3` | 12px | Gap entre elementos de una card |
| `space-4` | 16px | Padding horizontal de cards y secciones |
| `space-5` | 20px | Padding vertical de secciones |
| `space-6` | 24px | Gap entre cards del grid |
| `space-8` | 32px | Separación entre secciones mayores |

**Border radius:**
- `4px` — badges, pills pequeños
- `10px` — botones, inputs, opciones de radio/checkbox
- `14px` — cards de items del menú
- `20px` — cards grandes, modales, drawer del carrito
- `99px` — pills de categoría, badges de estado

**Bordes:** `0.5px solid #E8E0D8` para la mayoría de cards. `1px solid #D4580A` para elementos activos/seleccionados.

---

### Sombras

Solo funcionales, nunca decorativas.

| Nivel | CSS | Uso |
|---|---|---|
| Baja | `0 1px 3px rgba(28,20,16,0.08)` | Cards flotando sobre el fondo |
| Media | `0 4px 12px rgba(28,20,16,0.12)` | Drawer del carrito, modal de item |
| Alta | `0 8px 24px rgba(28,20,16,0.16)` | Bottom bar fija, header sticky |

---

### Iconografía

**Librería: Lucide Icons**
Ya incluida en el stack (`lucide-react`). Stroke-based, limpia, sin rellenos por defecto. Tamaño estándar: `20px` para navegación, `16px` para inline, `24px` para acciones destacadas.

Iconos clave del proyecto:
- `ShoppingBag` — carrito
- `Plus` / `Minus` — agregar/quitar cantidad
- `Copy` — copiar datos bancarios
- `CheckCircle` — éxito
- `Clock` — timer de expiración
- `ChefHat` — kitchen display
- `Loader2` — spinner de carga (con `animate-spin`)
- `AlertCircle` — error
- `ArrowLeft` — navegación atrás

---

## 3. Componentes Base

### MenuItemCard

Card del grid de menú. Dos variantes: **simple** (sin opciones obligatorias, tap `+` agrega directo) y **con opciones** (tap abre el modal de personalización).

**Anatomía:**
```
┌─────────────────────────┐
│  [imagen cuadrada 1:1]  │  ← aspect-ratio: 1/1, object-fit: cover
│                         │     Placeholder: emoji en fondo Arena
├─────────────────────────┤
│  Nombre del plato       │  ← 14px SemiBold, Marrón Profundo
│  REF X,XX               │  ← 16px ExtraBold, Rojo Fogón
│  Bs. X.XXX,XX      [+]  │  ← 11px Regular, Gris Muted | botón 28px
└─────────────────────────┘
```

**Estados:**
- Default: borde `0.5px #E8E0D8`, fondo blanco
- Hover/Press: escala leve `scale(0.98)`, borde `#D4580A`
- No disponible: imagen con `opacity: 0.4`, badge "No disponible" superpuesto, botón `+` deshabilitado en gris

**Regla del botón `+`:**
- Item sin `option_groups` con `required: true` → `+` agrega directamente al carrito con cantidad 1
- Item con al menos un grupo obligatorio → `+` abre el modal de detalle/personalización

---

### OptionGroup

Componente del modal de detalle. Dos variantes: `radio` (contorno, obligatorio) y `checkbox` (adicionales, opcional).

**Header del grupo:**
```
Elige tu contorno          [OBLIGATORIO]   ← badge rojo para required
Adicionales                [OPCIONAL]      ← badge gris para no required
```

**Fila de opción (radio):**
```
○  Arroz blanco                  Incluido
●  Ensalada                      Incluido   ← seleccionado: círculo relleno Rojo Fogón
○  Yuca                          Incluido
○  Arepita                       Incluido
```

**Fila de opción (checkbox):**
```
☑  Papas fritas              + Bs. 902,02   ← checked: fondo Rojo Fogón con ✓
☐  Patacones                 + Bs. 902,02
☐  Salsa agridulce           + Bs. 225,76
```

El precio de los adicionales en Bs. se calcula en tiempo real con la tasa activa.

---

### PriceBadge

Componente reutilizable para mostrar precios duales.

```
REF 3,10        ← ExtraBold, Rojo Fogón, tamaño configurable
Bs. 1.399,68    ← Regular, Gris Muted, siempre debajo del REF
```

Variante compacta (dentro de botones):
```
Agregar · Bs. 1.399,68
```
Solo Bs. en el botón — el cliente ya vio el REF en la card.

---

### RatePill

Pill verde fijo en el header. Comunica transparencia sobre la tasa usada.

```
● BCV Bs. 451,51
```

- Dot verde animado con pulso suave (CSS animation, no framer-motion)
- Si la tasa tiene más de 24h sin actualizar → dot ámbar + tooltip "Tasa del día anterior"
- Si no hay tasa disponible → ocultarlo completamente, no mostrar error

---

### CopyButton

Botón de copia para la pantalla de pago. Estado visual de confirmación.

- Default: ícono `Copy`, fondo `#F5E8D8`
- Copiado: ícono `Check`, fondo `#EEF7EB` (verde claro), dura 2 segundos
- `navigator.clipboard.writeText()` — sin librerías adicionales

---

### StatusPill

Badge de estado de orden para el admin y kitchen display.

| Estado | Fondo | Texto | Label |
|---|---|---|---|
| `pending` | `#FFF7ED` | `#92400E` | Pendiente |
| `paid` | `#EEF7EB` | `#2D6A1F` | Pagado |
| `kitchen` | `#EFF6FF` | `#1E40AF` | En cocina |
| `delivered` | `#F0FDF4` | `#166534` | Entregado |
| `expired` | `#FEF2F2` | `#B91C1C` | Expirado |
| `failed` | `#FEF2F2` | `#B91C1C` | Fallido |

---

## 4. Flujos y Pantallas — App del Cliente

### 4.1 Menú principal

**Ruta:** `/`  
**Rendering:** RSC + ISR

**Estructura de la pantalla (top → bottom):**

```
┌─────────────────────────────────┐
│ STATUS BAR (sistema)            │
├─────────────────────────────────┤
│ HEADER (sticky, sombra alta)    │
│  [G&M logo]      ● BCV 451,51  │
│  [Búsqueda futura]   [🛍 carrito]│
├─────────────────────────────────┤
│ CATEGORÍAS (scroll horizontal)  │
│  [Todos] [Pollos] [Carnes] ...  │
├─────────────────────────────────┤
│ GRID DE ITEMS (2 columnas)      │
│  card  card                     │
│  card  card                     │
│  ...                            │
├─────────────────────────────────┤
│ BOTTOM BAR (sticky, aparece     │
│ cuando hay items en el carrito) │
│  Mi pedido (N)  REF X,XX        │
│  Bs. X.XXX,XX   [Ver pedido →]  │
└─────────────────────────────────┘
```

**Comportamiento del header:**
- Logo "G&M" en Playfair Display, color Rojo Fogón
- Pill de tasa BCV alineado a la derecha del logo
- Icono del carrito con badge de cantidad — solo visible cuando hay items

**Comportamiento de categorías:**
- Scroll horizontal sin scrollbar visible
- La categoría activa tiene fondo Rojo Fogón y texto blanco; las demás son outline
- "Todos" siempre es la primera y está activa por defecto
- Filtrado en el cliente — no hace re-fetch al cambiar de categoría

**Comportamiento del grid:**
- 2 columnas en móvil (el 95% del caso de uso)
- Items no disponibles aparecen al final del grid, con opacidad reducida
- Al hacer tap en `+` de un item sin opciones obligatorias: agrega al carrito con feedback haptico (`navigator.vibrate(30)`) y animación del badge del carrito (+1)
- Al hacer tap en `+` de un item con opciones obligatorias: abre el modal de detalle

**Bottom bar del carrito:**
- Oculta cuando el carrito está vacío (`items.length === 0`)
- Aparece con transición `translateY` desde abajo (CSS transition, 200ms ease-out)
- Muestra: label "Mi pedido (N items)", total en REF, total en Bs., botón "Ver pedido →"
- Tap en el botón abre el drawer del carrito

---

### 4.2 Detalle de item con personalización

**Trigger:** tap en `+` de un item con grupos de opciones obligatorios  
**Presentación:** bottom sheet / modal que sube desde abajo (CSS transition)

**Estructura:**

```
┌─────────────────────────────────┐
│ [imagen hero 16:9]              │
│ [← botón cerrar]                │
├─────────────────────────────────┤
│ Nombre del plato       18px 700 │
│ Descripción breve      12px 400 │
│ REF 3,10               22px 800 │
│ Bs. 1.399,68           13px 400 │
├─────────────────────────────────┤
│ ── Elige tu contorno ─────────  │
│ [OBLIGATORIO]                   │
│  ○ Arroz blanco      Incluido   │
│  ● Ensalada          Incluido   │
│  ○ Yuca              Incluido   │
│  ○ Arepita           Incluido   │
├─────────────────────────────────┤
│ ── Adicionales ────────────────  │
│ [OPCIONAL]                      │
│  ☑ Papas fritas    + Bs. 902,02 │
│  ☐ Patacones       + Bs. 902,02 │
│  ☐ Salsa agridulce + Bs. 225,76 │
├─────────────────────────────────┤
│ FOOTER FIJO                     │
│  [−] 1 [+]                      │
│  [Agregar · Bs. 2.301,70    ]   │
│   Ensalada + Papas fritas       │  ← resumen legible
└─────────────────────────────────┘
```

**Comportamiento del footer:**
- El botón "Agregar" está **deshabilitado** (gris, no interactivo) hasta que todos los grupos con `required: true` tengan una selección
- El precio en el botón se actualiza en tiempo real: `precio base + suma de adicionales seleccionados` × `cantidad`
- El resumen de texto debajo del botón lista lo seleccionado: "Ensalada + Papas fritas"
- Al confirmar: agrega al `cartStore`, cierra el modal con transición hacia abajo, feedback haptico

**Validación en el botón:**
- Si `required` group sin selección → botón disabled + texto "Elige un contorno"
- Si todo completo → botón activo en Rojo Fogón con precio calculado

---

### 4.3 Carrito (drawer)

**Trigger:** tap en "Ver pedido →" del bottom bar  
**Presentación:** bottom sheet que cubre ~80% de la pantalla. Overlay oscuro semitransparente detrás.

**Estructura:**

```
┌─────────────────────────────────┐
│ ── Mi Pedido ──────── [✕]       │
├─────────────────────────────────┤
│ LISTA DE ITEMS (scrollable)     │
│                                 │
│  🍗 Pollo Guisado               │
│     Contorno: Ensalada          │
│     + Papas fritas              │
│     REF 5,10  Bs. 2.302,69      │
│     [−] 1 [+]         [🗑]      │
│  ─────────────────────────────  │
│  🥩 Bistec en Salsa             │
│     Contorno: Arroz             │
│     REF 3,60  Bs. 1.625,43      │
│     [−] 1 [+]         [🗑]      │
│                                 │
├─────────────────────────────────┤
│ RESUMEN                         │
│  Subtotal     REF 8,70          │
│               Bs. 3.928,12      │
├─────────────────────────────────┤
│  [Confirmar pedido →]           │
│  Bs. 3.928,12                   │
└─────────────────────────────────┘
```

**Comportamiento:**
- Cada item muestra su desglose: nombre + contorno elegido + adicionales seleccionados
- `[−]` reduce cantidad; si llega a 0, pregunta confirmación antes de eliminar
- `[🗑]` elimina el item directamente con swipe o tap
- El subtotal se recalcula en tiempo real al cambiar cantidades
- El botón "Confirmar pedido →" navega a `/checkout`
- El drawer se cierra al tocar el overlay o el `[✕]`

---

### 4.4 Checkout — formulario

**Ruta:** `/checkout`  
**Rendering:** Client Component

**Estructura:**

```
┌─────────────────────────────────┐
│ [← Volver]   Checkout           │
├─────────────────────────────────┤
│ RESUMEN DEL PEDIDO (colapsado)  │
│  3 items · REF 8,70             │
│  Bs. 3.928,12            [ver ▾]│
├─────────────────────────────────┤
│ DATOS DE PAGO                   │
│                                 │
│  Método de pago                 │
│  ┌─────────────────────────┐    │
│  │ ● Pago Móvil            │    │  ← seleccionado por defecto
│  │   Recomendado           │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ ○ Transferencia         │    │
│  └─────────────────────────┘    │
│                                 │
│  Tu número de teléfono          │
│  [04141234567              ]    │
│  11 dígitos sin espacios        │
│                                 │
│  [error inline si aplica]       │
├─────────────────────────────────┤
│  [Confirmar pedido →]           │
│  Bs. 3.928,12                   │
└─────────────────────────────────┘
```

**Comportamiento:**
- El método de pago son dos cards seleccionables con radio implícito — no un `<select>`
- "Pago Móvil" tiene badge "Recomendado" y está seleccionado por defecto
- El input de teléfono tiene `type="tel"` e `inputmode="numeric"` para abrir el teclado numérico en móvil
- Validación en tiempo real (Valibot): el error aparece debajo del campo, no en un alert
- El botón permanece activo todo el tiempo — la validación ocurre al hacer submit, no bloquea antes
- Al hacer submit: el botón muestra spinner + "Procesando..." y se deshabilita para evitar doble tap
- Si el Server Action retorna error: el botón vuelve a activo, el error aparece en rojo sobre el botón

---

### 4.5 Checkout — esperando pago

**Trigger:** Server Action exitoso — orden creada en BD  
**Esta es la pantalla más importante de toda la app.**

**Estructura:**

```
┌─────────────────────────────────┐
│ [← Volver]   Confirmar pago     │
├─────────────────────────────────┤
│ MONTO EXACTO                    │
│                                 │
│  Transfiere exactamente         │
│                                 │
│       Bs. 3.928,15              │  ← 36px 800, Rojo Fogón
│                                 │
│  ● Esperando confirmación...    │  ← dot pulsante animado
│  Los céntimos identifican       │
│  tu pedido de forma única       │
│                                 │
├─────────────────────────────────┤
│ DATOS PARA PAGO MÓVIL           │
│                                 │
│  Banco         Banesco (0134)   │
│                          [📋]   │
│  Teléfono      0414-1234567     │
│                          [📋]   │
│  RIF / Cédula  J-12345678-9     │
│                          [📋]   │
│                                 │
├─────────────────────────────────┤
│ RESUMEN                         │
│  1× Pollo Guisado  Bs. 2.302,69│
│     Ensalada + Papas fritas     │
│  1× Bistec         Bs. 1.625,43│
│     Arroz                       │
│  ─────────────────────────────  │
│  Total          Bs. 3.928,15   │
│  ⏱ Expira en 28 min            │  ← color ámbar si <5 min
└─────────────────────────────────┘
```

**Comportamiento crítico:**
- El monto `Bs. 3.928,15` incluye los céntimos dinámicos de conciliación (`.15` en este ejemplo)
- El polling se activa inmediatamente con TanStack Query: `refetchInterval: 3000`
- El dot pulsante usa CSS animation (`@keyframes pulse`) — sin framer-motion
- El timer de expiración hace countdown en el cliente desde `expiresAt`
- Si quedan menos de 5 minutos → timer cambia a color ámbar + texto "¡Apresúrate!"
- Si la orden expira → navega automáticamente a la pantalla de error de expiración
- Si `status === 'paid'` → navega a la pantalla de éxito
- El botón "Volver" está presente pero muestra un diálogo de confirmación: "¿Seguro? Tu pedido seguirá activo por X minutos"
- **No hay botón de "ya pagué" ni de "reenviar"** — el sistema confirma automáticamente

**Diseño del monto:**
El `Bs. 3.928,15` va en la tipografía más grande de toda la app (36–40px, weight 800). Es el único elemento de esa pantalla que el usuario necesita ver y recordar. Todo lo demás es secundario.

---

### 4.6 Pantalla de éxito

**Trigger:** polling detecta `status === 'paid'`

**Estructura:**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│          ✓                      │  ← círculo verde grande, CSS animation
│                                 │
│     ¡Pago Confirmado!           │  ← 24px 700, Verde Selva
│                                 │
│  Tu pedido ya está en cocina.   │  ← 14px 400, Gris Muted
│  En breve estará listo.         │
│                                 │
│  ─────────────────────────────  │
│  📋 Resumen                     │
│  1× Pollo Guisado               │
│  1× Bistec en Salsa             │
│  Total  Bs. 3.928,15            │
│                                 │
│                                 │
│  [Volver al menú]               │
│                                 │
└─────────────────────────────────┘
```

**Comportamiento:**
- El círculo verde con el check animado usa CSS `@keyframes` — escala de 0 a 1 con un bounce suave
- Feedback haptico al llegar: `navigator.vibrate([100, 50, 200])`
- `clearCart()` se ejecuta al montar esta pantalla
- El botón "Volver al menú" navega a `/` y es el único elemento interactivo
- No hay botón de "compartir" ni de "calificar" — mantener el flujo limpio

**El check animado (sin framer-motion):**
```css
@keyframes checkAppear {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}
.check-circle {
  animation: checkAppear 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

---

### 4.7 Pantalla de error

Hay dos variantes: orden expirada y error genérico del sistema.

#### Variante A — Orden expirada

**Trigger:** polling detecta `status === 'expired'` o timer llega a 0

```
┌─────────────────────────────────┐
│                                 │
│          ⏱                      │  ← ícono Clock en ámbar
│                                 │
│    Tu pedido expiró             │  ← 20px 700, Marrón Profundo
│                                 │
│  Pasaron más de 30 minutos      │
│  sin recibir la transferencia.  │
│                                 │
│  Si ya pagaste, guarda la       │
│  referencia y muéstrasela al    │  ← instrucción clara de qué hacer
│  cajero para verificarlo.       │
│                                 │
│  [Hacer nuevo pedido]           │  ← CTA principal, Rojo Fogón
│  [Hablar con el cajero]         │  ← CTA secundario, outline
│                                 │
└─────────────────────────────────┘
```

#### Variante B — Error del sistema

**Trigger:** Server Action retorna `success: false` o error de red

```
┌─────────────────────────────────┐
│                                 │
│          ⚠                      │  ← ícono en Rojo Error
│                                 │
│   Algo salió mal                │
│                                 │
│  [mensaje de error específico]  │
│                                 │
│  [Intentar de nuevo]            │
│  [Volver al menú]               │
│                                 │
└─────────────────────────────────┘
```

**Principio:** siempre dar al usuario una acción concreta. Nunca dejar una pantalla de error sin un camino de salida claro.

---

### 4.8 Skeleton states y carga

**Principio:** nunca mostrar una pantalla en blanco. Si hay latencia, mostrar la estructura de lo que va a aparecer.

#### Skeleton del grid de menú

Mientras carga el RSC inicial o hay error de red:

```
┌────────────┐  ┌────────────┐
│ ░░░░░░░░░░ │  │ ░░░░░░░░░░ │   ← rect animado color #E8E0D8
│ ░░░░░░░░░░ │  │ ░░░░░░░░░░ │     shimmer de izq a der
│ ████░░░░░  │  │ ████░░░░░  │     con CSS animation
│ ██░░░░░░   │  │ ██░░░░░░   │
└────────────┘  └────────────┘
```

4 cards skeleton visibles. La animación es un shimmer horizontal:

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #E8E0D8 25%, #F5EDE5 50%, #E8E0D8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

#### Skeleton del detalle de item

Mientras se abre el modal (la imagen del plato puede tardar en cargar):
- La imagen hero muestra el placeholder en `#F5E8D8` con el emoji del plato centrado como fallback
- Los grupos de opciones aparecen de inmediato (vienen con el RSC) — no tienen skeleton

#### Estado offline

Si el service worker detecta que no hay conexión al intentar hacer checkout:
- Banner en la parte superior: fondo ámbar, texto "Sin conexión — el menú está disponible pero no puedes hacer pedidos ahora"
- El botón "Ver pedido →" aparece deshabilitado con tooltip explicativo
- El menú sigue siendo completamente navegable desde el caché del SW

---

## 5. Flujos y Pantallas — Kitchen Display

**Ruta:** `/kitchen`  
**Acceso:** solo usuarios con rol `kitchen` o `admin`  
**Dispositivo objetivo:** tablet 10"+ o TV con teclado/mouse en cocina

### Principios específicos del Kitchen Display

- Touch targets **mínimo 60px** — las manos en cocina están húmedas o con guantes
- Tipografía **grande** — la pantalla se ve desde 1–2 metros de distancia
- **Sin animaciones** de entrada/salida de cards — el cocinero necesita estabilidad visual
- **Alto contraste** — ambiente con vapor y luz variable
- **Sin lógica de negocio crítica** — solo cambia estados, no procesa pagos
- Polling cada 5 segundos — las nuevas órdenes aparecen sin recargar la página

### Layout

```
┌─────────────────────────────────────────────────────┐
│  🍳 G&M Cocina          Ordenadas por hora llegada  │  ← header fijo
│  [Pendientes: 3]  [En preparación: 1]               │
├──────────────┬──────────────┬──────────────────────-┤
│  ORDEN #042  │  ORDEN #041  │  ORDEN #040           │
│  hace 2 min  │  hace 8 min  │  hace 15 min          │
│              │              │                        │
│  🍗 Pollo    │  🥩 Bistec   │  🍝 Pasta c/Pollo     │
│  Ensalada    │  Arroz       │  (sin contorno)        │
│  + Papas     │              │  + Patacones           │
│              │  🍗 Pollo    │                        │
│              │  Yuca        │  🥩 Lomo Negro         │
│              │              │  Arroz                 │
│              │              │                        │
│ [EN COCINA]  │ [ENTREGADO ✓]│  [EN COCINA]          │
│              │              │                        │
└──────────────┴──────────────┴────────────────────────┘
```

### Card de orden

```
┌────────────────────────────────┐
│  #042              hace 2 min  │  ← número de orden + tiempo transcurrido
│  ────────────────────────────  │
│                                │
│  🍗 Pollo Guisado              │  ← 18px SemiBold
│     Contorno: Ensalada         │  ← 14px Regular, Gris Muted
│     + Papas fritas             │  ← 14px Regular, Naranja Brasa
│                                │
│  🍝 Pasta Boloña               │
│     Contorno: Arroz            │
│                                │
│  ────────────────────────────  │
│  ****1234  ·  Pago Móvil       │  ← teléfono ofuscado + método
│                                │
│  [    EN COCINA    ]           │  ← botón 60px alto, azul
│                                │
└────────────────────────────────┘
```

### Estados de las órdenes en Kitchen Display

Solo se muestran órdenes `paid` y `kitchen`. Las `delivered` desaparecen del display.

| Estado en pantalla | Color del botón | Acción del botón |
|---|---|---|
| Nueva (recién llegada `paid`) | Rojo Fogón | "Tomar pedido" → cambia a `kitchen` |
| En preparación (`kitchen`) | Azul Info | "Marcar entregado" → cambia a `delivered` |

**Comportamiento de nuevas órdenes:**
Cuando llega una nueva orden vía polling, la card aparece en la columna más a la izquierda con un borde Rojo Fogón pulsante (CSS animation) durante 5 segundos. Sin sonido — no hay garantía de que haya audio en la cocina.

**Columnas:**
Las órdenes se ordenan de más reciente (izquierda) a más antigua (derecha), o de más antigua a más reciente según prefiera el dueño — configurable en settings. Se muestran máximo 4 columnas en tablet, 6 en pantalla grande. Si hay más órdenes, scroll horizontal.

---

## 6. Estrategia de Precios Duales (REF + Bs.)

### Jerarquía visual en cada contexto

| Pantalla | Qué mostrar | Jerarquía |
|---|---|---|
| Card del menú | REF + Bs. | REF grande bold, Bs. pequeño debajo |
| Bottom bar / carrito | REF + Bs. | REF como total principal, Bs. secundario |
| Detalle del item | REF + Bs. | REF grande, Bs. debajo |
| Adicionales | Solo Bs. | El adicional en USD sería confuso en contexto de suma |
| Checkout — formulario | Solo Bs. | El cliente va a transferir en Bs. |
| Pantalla de espera/pago | Solo Bs. | El monto a transferir, sin ambigüedad |
| Pantalla de éxito | Solo Bs. | Confirma lo que se pagó |
| Kitchen Display | Solo cantidades | Sin precios en cocina |
| Admin — órdenes | Ambos | REF y Bs. al lado para auditoría |

### Formato de los números

```typescript
// lib/money.ts

// REF: siempre con coma decimal, sin separador de miles
// USD 3.10 → "REF 3,10"
// USD 15.00 → "REF 15,00"
function formatRef(usdCents: number): string {
  return `REF ${(usdCents / 100).toFixed(2).replace('.', ',')}`
}

// Bs.: punto para miles, coma para decimales — convención venezolana
// 1399680 bs_cents → "Bs. 13.996,80"
// 451510 bs_cents → "Bs. 4.515,10"
function formatBs(bsCents: number): string {
  const value = bsCents / 100
  return `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
```

### La tasa BCV — comportamiento en UI

**Actualización diaria (~6:00 PM UTC-4):**
- El Cron Job actualiza la tasa en BD
- El caché del servidor se invalida
- Los precios en Bs. del menú se recalculan en el próximo request al RSC
- Los clientes con la app abierta ven la tasa antigua hasta que recarguen — esto es aceptable y esperado

**Pill de tasa en el header:**
- Verde activo: tasa del día cargada correctamente
- Ámbar: tasa de más de 24h (el Cron falló o el BCV no publicó)
- Oculto: sin tasa disponible en absoluto

**En la pantalla de checkout:**
La tasa usada para calcular el monto final se bloquea en el momento de crear la orden (guardada en `rate_snapshot_bs_per_usd`). Si la tasa cambia después de que el cliente vio el precio en el menú pero antes de pagar — puede haber una diferencia de céntimos. Esto es un edge case aceptable y documentado en los ADRs del spec técnico.

---

## 7. Accesibilidad y Contexto Venezolano

### Tamaños de toque mínimos

- Botones de acción principal (agregar, confirmar): `min-height: 48px`
- Botones del Kitchen Display: `min-height: 60px`
- Opciones de radio/checkbox: área táctil `44px × 44px` mínimo aunque el visual sea más pequeño (padding invisible)
- Ícono copy en la pantalla de pago: `44px × 44px` área táctil

### Imágenes que no cargan

El menú físico de G&M no tiene fotos — las imágenes serán tomadas o conseguidas después. El diseño nunca debe depender de que la imagen esté disponible.

Jerarquía de fallback para `image_url`:
1. Imagen real del plato desde Supabase Storage
2. Placeholder: fondo `#F5E8D8` (Arena Claro) + emoji representativo centrado en 40px
3. Nunca: imagen rota, ícono genérico de imagen, espacio vacío

Los emojis de fallback por categoría:
- Pollos / aves: 🍗
- Carnes: 🥩
- Pasta / carbohidratos: 🍝
- Mariscos: 🍤
- Ensaladas: 🥗
- Bebidas: 🥤
- Adicionales / sides: 🍟

### Texto legible en condiciones difíciles

- Contraste mínimo WCAG AA en todos los textos sobre fondos de color
- El precio `REF X,XX` sobre fondo blanco de card: contraste `#8B2500` sobre `#FFFFFF` = 8.1:1 ✓
- El precio Bs. en color Gris Muted `#8A8278` sobre blanco: 3.2:1 — mínimo aceptable para texto secundario de 11px

### Teclado numérico en móvil

El input de teléfono usa:
```html
<input type="tel" inputmode="numeric" pattern="[0-9]*" />
```
Esto abre el teclado numérico nativo en iOS y Android, eliminando la necesidad de cambiar de teclado.

---

## 8. Logo e Identidad de G&M

### Concepto

G&M no tiene logo existente. El logo se construye desde la tipografía y el concepto del restaurante: comida casera venezolana, calidad, tradición familiar.

### Propuesta de logotipo

**Wordmark tipográfico:**
- Letras `G&M` en Playfair Display Bold — serif con personalidad, evoca tradición
- El `&` puede usarse como elemento decorativo o reducirse en tamaño entre las dos letras
- Color: Rojo Fogón `#8B2500` sobre fondos claros; Crema Cálido `#FDF6EE` sobre fondos oscuros

**Isotipo (versión compacta para favicon/app icon):**
- Las iniciales `GM` en un rectángulo redondeado con fondo Rojo Fogón
- O alternativamente: solo el `&` estilizado como símbolo único
- Usado en: favicon 16×16, app icon 192×192, badge del carrito

**Usos del logo en la app:**
- Header del menú: wordmark completo "G&M" en Playfair Display, ~22px
- Splash/PWA icon: isotipo sobre fondo Rojo Fogón
- Kitchen Display header: wordmark + "Cocina" como subtítulo

### Escalabilidad a multi-restaurante

Cuando la app escale a otros restaurantes, el sistema de diseño se mantiene pero cada restaurante tiene su propio color primario y logo. El "Rojo Fogón" es específico de G&M. Otros restaurantes tendrán su propia paleta primaria mientras el layout, tipografía base y componentes permanecen iguales.

El nombre de la plataforma (el producto técnico que se vende a restaurantes) puede ser distinto del nombre visible al cliente en cada instalación. Eso es una decisión de producto futura, no de diseño inmediato.

---

*Fin del documento. Última actualización: Marzo 2026 — Versión 1.0*
*Ver también: `BURGERTECH_SPEC.md` para la especificación técnica completa.*
