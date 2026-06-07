import React from "react";
import {
  Drumstick,
  Beef,
  Wheat,
  Fish,
  Salad,
  CupSoda,
  Utensils,
  UtensilsCrossed,
  Flame,
  Soup,
  Smile,
  Pizza,
  Cake,
  Sandwich,
  CookingPot,
  type LucideIcon,
} from "lucide-react";

// Custom handcrafted Rice bowl with chopsticks icon in pure TS (React.createElement) to match Lucide's 24x24 style.
const RiceIcon = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<"svg">>(
  ({ className, ...props }, ref) =>
    React.createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        ...props,
      },
      // Bowl body — U-shape
      React.createElement("path", { d: "M4 13C4 17.5 7.5 20 12 20C16.5 20 20 17.5 20 13" }),
      // Rice grains — three bumps, center tallest
      React.createElement("path", { d: "M5 13c1-2 4-2 5.5 0c1-3 4-3 5 0c1-2 3.5-2 4.5 0" }),
      // Bowl base / foot
      React.createElement("path", { d: "M9.5 20c0 1 1 2 2.5 2s2.5-1 2.5-2" }),
      // Chopstick 1
      React.createElement("line", { x1: "10", y1: "10", x2: "19.5", y2: "2" }),
      // Chopstick 2
      React.createElement("line", { x1: "12.5", y1: "10.5", x2: "21.5", y2: "3" })
    )
) as LucideIcon;
RiceIcon.displayName = "RiceIcon";

const AdicionalesIcon = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<"svg">>(
  ({ className, ...props }, ref) =>
    React.createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        ...props,
      },
      React.createElement("rect", { x: "3", y: "3", width: "7.5", height: "7.5", rx: "2" }),
      React.createElement("rect", { x: "13.5", y: "3", width: "7.5", height: "7.5", rx: "2" }),
      React.createElement("rect", { x: "3", y: "13.5", width: "7.5", height: "7.5", rx: "2" }),
      React.createElement("line", { x1: "17.25", y1: "14.5", x2: "17.25", y2: "20" }),
      React.createElement("line", { x1: "14.5", y1: "17.25", x2: "20", y2: "17.25" })
    )
) as LucideIcon;
AdicionalesIcon.displayName = "AdicionalesIcon";

// Monochrome line icons per category — inherit currentColor so they match the
// pill's text color (white on the active red pill, ink on inactive ones).
// Keys mirror the existing CATEGORY_EMOJI lookup used across menu cards.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  pollos: Drumstick,
  "pollos a la brasa": Flame,
  carnes: Beef,
  pastas: Wheat,
  mariscos: Fish,
  ensaladas: Salad,
  bebidas: CupSoda,
  adicionales: AdicionalesIcon,
  arroces: RiceIcon,
  "sopas & guisos": Soup,
  sopas: Soup,
  parrillas: Flame,
  "menu kids": Smile,
  "comida rapida": Pizza,
  postres: Cake,
  sándwiches: Sandwich,
  sandwiches: Sandwich,
  contornos: CookingPot,
};

// Emoji equivalents of the category icons. Canonical home for the
// CATEGORY_EMOJI lookup that used to be copy-pasted across menu cards and item
// detail modals (customer + POS). Includes the POS-only extra categories.
const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗",
  "pollos a la brasa": "🔥",
  carnes: "🥩",
  pastas: "🍝",
  mariscos: "🍤",
  ensaladas: "🥗",
  bebidas: "🥤",
  adicionales: "🍟",
  arroces: "🍚",
  "sopas & guisos": "🍲",
  sopas: "🍲",
  parrillas: "🍖",
  "menu kids": "🧸",
  "comida rapida": "🍕",
  postres: "🍮",
  sándwiches: "🥪",
  sandwiches: "🥪",
  contornos: "🍛",
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
