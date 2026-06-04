import {
  Drumstick,
  Beef,
  Wheat,
  Fish,
  Salad,
  CupSoda,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// Monochrome line icons per category — inherit currentColor so they match the
// pill's text color (white on the active red pill, ink on inactive ones).
// Keys mirror the existing CATEGORY_EMOJI lookup used across menu cards.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  pollos: Drumstick,
  carnes: Beef,
  pastas: Wheat,
  mariscos: Fish,
  ensaladas: Salad,
  bebidas: CupSoda,
  adicionales: Utensils,
};

// Emoji equivalents of the category icons. Canonical home for the
// CATEGORY_EMOJI lookup that used to be copy-pasted across menu cards and item
// detail modals (customer + POS). Includes the POS-only extra categories.
const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗",
  carnes: "🥩",
  pastas: "🍝",
  mariscos: "🍤",
  ensaladas: "🥗",
  bebidas: "🥤",
  adicionales: "🍟",
  postres: "🍮",
  sopas: "🍲",
  sándwiches: "🥪",
  sandwiches: "🥪",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON[normalize(name)] ?? UtensilsCrossed;
}

export function getCategoryEmoji(name: string): string {
  return CATEGORY_EMOJI[normalize(name)] ?? "🍽️";
}
