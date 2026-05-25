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

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON[normalize(name)] ?? UtensilsCrossed;
}
