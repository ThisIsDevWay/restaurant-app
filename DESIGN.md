# Design System Specification: Editorial Heritage

## 1. Overview & Creative North Star
The visual identity of this design system is rooted in **"Heritage Editorial."** It is a sophisticated marriage between nostalgic diner warmth and high-end digital precision. Unlike standard mobile apps that rely on rigid borders and generic grids, this system uses the brand's bold palette to create an immersive, tactile experience.

**The Creative North Star: The Modern Rotisserie.** 
We aim to capture the heat of the kitchen and the craft of the artisan. This is achieved through "Organic Intentionality"—using extreme typographic scales, asymmetric layouts that feel curated rather than templated, and a depth model based on physical layering rather than synthetic shadows.

---

## 2. Color Philosophy
Our palette is a high-contrast triad of Heritage Red, Ink Black, and Warm Cream. These colors must be used to create "atmosphere" rather than just "interface."

*   **Primary (`#bb0005`):** Reserved for high-action moments and brand signatures. Use the `primary-container` (`#e2231a`) for large hero moments to provide a deeper, more velvety red.
*   **The Cream Canvas (`#fff8f3`):** The `surface` and `background` are never pure white. This warm cream base removes the clinical "digital" feel and replaces it with a premium paper quality.
*   **The "No-Line" Rule:** Visual separation must never be achieved with 1px solid lines. Instead, use tonal shifts. A card should be defined by sitting a `surface-container-lowest` (`#ffffff`) element on a `surface-container-low` (`#fff2e2`) background.
*   **Signature Textures:** For primary CTAs, apply a subtle linear gradient from `primary` to `primary_container`. This 15-degree tilt adds a "soul" to the button that a flat hex code cannot achieve, mimicking the way light hits a lacquered surface.
*   **Glassmorphism:** For floating navigation or modal overlays, use semi-transparent `surface_container` colors with a 20px backdrop-blur. This allows the warmth of the underlying content to bleed through, maintaining a cohesive "warm" environment.

---

## 3. Typography
The typography is the voice of the system. We pair the authoritative, high-character **Epilogue** for display with the modern, legible **Plus Jakarta Sans** for utility.

*   **Display & Headline (Epilogue):** These are our "Editorial" levels. Use `display-lg` (3.5rem) with tight letter-spacing to create a bold, "poster" aesthetic. These should often be placed with intentional asymmetry—for example, bleeding off the left margin—to break the "app-like" feel.
*   **Body & Labels (Plus Jakarta Sans):** These levels handle the heavy lifting of information. We use `body-lg` for descriptions to maintain a premium, readable feel. 
*   **Hierarchy Note:** Information density should be low. Let the `headline-md` breathe; the contrast between a massive red headline and small, precise `label-md` text in `secondary` (`#5f5e5e`) creates an expensive, curated look.

---

## 4. Elevation & Depth
In this system, depth is a product of light and material stacking, not digital effects.

*   **The Layering Principle:** Treat the UI as stacked sheets of fine paper. 
    *   Base: `surface`
    *   Section: `surface-container-low`
    *   Interactive Element: `surface-container-lowest`
*   **Ambient Shadows:** If a floating action is required, shadows must use the `on_surface` color (`#251a07`) at 5% opacity with a 32px blur and 8px Y-offset. This mimics natural ambient occlusion rather than a "drop shadow."
*   **The "Ghost Border" Fallback:** If a container requires a boundary for accessibility (e.g., in high-glare environments), use the `outline_variant` (`#e7bdb7`) at 15% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background with `on_primary` (White) text. Use the `xl` (3rem) roundedness for a pill-shaped, tactile feel.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Interaction:** On press, the button should scale down to 96% and shift to `primary_container`, providing a physical "click" sensation.

### Cards & Lists
*   **Constraint:** Zero dividers. Use vertical spacing (minimum 24dp) or subtle background shifts between `surface_container` tiers.
*   **Asymmetry:** Use images that break the card's boundary or use roundedness (`lg` - 2rem) on only three corners to create a custom, high-end editorial feel.

### Input Fields
*   **Style:** Minimalist. No enclosing box. Use a `surface-container-high` bottom-only highlight.
*   **Focus State:** The label transitions from `secondary` to `primary` with a 2px bottom weight shift.

### Signature Component: The "Heritage Tray"
A specific layout pattern where a `surface_container_lowest` card slides up over a `primary` hero section, featuring a `backdrop-blur` on the header. This mimics the brand's t-shirt and packaging design—bold blocks of color meeting clean, functional surfaces.

---

## 6. Do's and Don'ts

### Do:
*   **Do** embrace negative space. If you think there is enough room, add 8dp more.
*   **Do** use `display-lg` for single-word emotional hooks (e.g., "Savor," "Hot," "Fresh").
*   **Do** use the `full` roundedness for chips and buttons to contrast against the sharp editorial typography.

### Don't:
*   **Don't** use 100% black. Always use `on_background` (`#251a07`) for text to maintain the "ink on cream" warmth.
*   **Don't** use standard Material Design dividers. They clutter the "Heritage Editorial" look.
*   **Don't** place red text on a black background; use `on_primary_container` (Cream/White) for maximum legibility and premium contrast.