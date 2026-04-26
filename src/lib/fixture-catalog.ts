import type { FixtureType } from "@/db/schema/floor-fixtures";

export interface FixtureCatalogEntry {
  type: FixtureType;
  label: string;            // nombre para mostrar en la paleta
  description: string;      // tooltip
  defaultColSpan: number;
  defaultRowSpan: number;
  bg: string;               // color de fondo del fixture en el plano
  border: string;
  textColor: string;
  icon: string;             // nombre del icono lucide
  canRotate: boolean;
  isWall: boolean;          // renderiza como barra sólida sin icono
  isTransparent: boolean;   // text_label: sin fondo
}

export const FIXTURE_CATALOG: FixtureCatalogEntry[] = [
  // ── Estructura ───────────────────────────────────────────────────
  { type: "wall_h",       label: "Pared H",        description: "Pared horizontal",
    defaultColSpan: 4, defaultRowSpan: 1,
    bg: "#94a3b8", border: "#64748b", textColor: "#fff",
    icon: "Minus", canRotate: false, isWall: true, isTransparent: false },

  { type: "wall_v",       label: "Pared V",        description: "Pared vertical",
    defaultColSpan: 1, defaultRowSpan: 4,
    bg: "#94a3b8", border: "#64748b", textColor: "#fff",
    icon: "Minus", canRotate: false, isWall: true, isTransparent: false },

  { type: "column",       label: "Columna",        description: "Columna estructural",
    defaultColSpan: 1, defaultRowSpan: 1,
    bg: "#cbd5e1", border: "#94a3b8", textColor: "#334155",
    icon: "Circle", canRotate: false, isWall: false, isTransparent: false },

  // ── Accesos ──────────────────────────────────────────────────────
  { type: "door",         label: "Puerta",         description: "Puerta sencilla",
    defaultColSpan: 2, defaultRowSpan: 1,
    bg: "#fef9c3", border: "#ca8a04", textColor: "#713f12",
    icon: "DoorOpen", canRotate: true, isWall: false, isTransparent: false },

  { type: "door_double",  label: "Puerta Doble",   description: "Puerta doble",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#fef9c3", border: "#ca8a04", textColor: "#713f12",
    icon: "DoorOpen", canRotate: true, isWall: false, isTransparent: false },

  { type: "window",       label: "Ventana",        description: "Ventana exterior",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#e0f2fe", border: "#0284c7", textColor: "#0c4a6e",
    icon: "AppWindow", canRotate: true, isWall: false, isTransparent: false },

  // ── Mobiliario fijo ──────────────────────────────────────────────
  { type: "bar_counter",  label: "Barra",          description: "Mostrador de barra",
    defaultColSpan: 4, defaultRowSpan: 2,
    bg: "#fef3c7", border: "#d97706", textColor: "#78350f",
    icon: "GlassWater", canRotate: true, isWall: false, isTransparent: false },

  { type: "kitchen_pass", label: "Paso Cocina",    description: "Ventana de paso a cocina",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#fce7f3", border: "#db2777", textColor: "#831843",
    icon: "ChefHat", canRotate: true, isWall: false, isTransparent: false },

  { type: "cashier",      label: "Caja",           description: "Caja registradora / POS",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#f0fdf4", border: "#16a34a", textColor: "#14532d",
    icon: "CreditCard", canRotate: true, isWall: false, isTransparent: false },

  { type: "stairs",       label: "Escaleras",      description: "Escaleras",
    defaultColSpan: 3, defaultRowSpan: 3,
    bg: "#faf5ff", border: "#9333ea", textColor: "#581c87",
    icon: "ArrowUpDown", canRotate: false, isWall: false, isTransparent: false },

  // ── Sanitarios ───────────────────────────────────────────────────
  { type: "bathroom",     label: "Baño",           description: "Baño / Aseo",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#f0fdf4", border: "#6cc08a", textColor: "#14532d",
    icon: "Toilet", canRotate: false, isWall: false, isTransparent: false },

  { type: "bathroom_m",   label: "Baño ♂",         description: "Baño masculino",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#eff6ff", border: "#3b82f6", textColor: "#1e3a8a",
    icon: "User", canRotate: false, isWall: false, isTransparent: false },

  { type: "bathroom_f",   label: "Baño ♀",         description: "Baño femenino",
    defaultColSpan: 2, defaultRowSpan: 2,
    bg: "#fdf2f8", border: "#ec4899", textColor: "#831843",
    icon: "UserRound", canRotate: false, isWall: false, isTransparent: false },

  // ── Decorativo ───────────────────────────────────────────────────
  { type: "plant",        label: "Planta",         description: "Planta decorativa",
    defaultColSpan: 1, defaultRowSpan: 1,
    bg: "#f0fdf4", border: "#86efac", textColor: "#14532d",
    icon: "Leaf", canRotate: false, isWall: false, isTransparent: false },

  { type: "divider",      label: "Separador",      description: "Biombo / División",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "#f8fafc", border: "#94a3b8", textColor: "#475569",
    icon: "SeparatorHorizontal", canRotate: true, isWall: false, isTransparent: false },

  { type: "text_label",   label: "Etiqueta",       description: "Texto libre en el plano",
    defaultColSpan: 3, defaultRowSpan: 1,
    bg: "transparent", border: "transparent", textColor: "#64748b",
    icon: "Type", canRotate: false, isWall: false, isTransparent: true },
];

export const CATALOG_BY_TYPE = Object.fromEntries(
  FIXTURE_CATALOG.map((f) => [f.type, f])
) as Record<FixtureType, FixtureCatalogEntry>;
