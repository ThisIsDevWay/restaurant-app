"use server";

import {
  getDailyMenuItemsForDate,
  getDailyAdicionalesAsMenuItemsForDate,
  getDailyBebidasAsMenuItemsForDate,
  getDailyContornosAsMenuItemsForDate,
} from "@/db/queries/daily-menu";
import { getActiveRate, getSettings } from "@/db/queries/settings";

export interface MenuPdfItem {
  name: string;
  priceUsdCents: number;
  categoryName: string;
  includedNote: string | null;
}

export interface MenuPdfSimpleItem {
  name: string;
  priceUsdCents: number;
}

export interface MenuPdfData {
  restaurantName: string;
  logoUrl: string | null;
  whatsappNumber: string;
  branchName: string | null;
  /** Items grouped by price tier (priceUsdCents → items) */
  priceTiers: {
    priceUsdCents: number;
    items: MenuPdfItem[];
    /** If all items in this tier share the same includedNote, show it once */
    sharedIncludedNote: string | null;
  }[];
  contornos: string[];
  adicionales: MenuPdfSimpleItem[];
  bebidas: MenuPdfSimpleItem[];
  rateBsPerUsd: number;
  dateLabel: string;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function buildDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${d} de ${MONTHS[dt.getMonth()]} ${y}`;
}

export async function fetchMenuPdfData(dateStr: string): Promise<MenuPdfData> {
  const [settings, rateInfo, dailyItems, dailyAdicionales, dailyBebidas, dailyContornos] =
    await Promise.all([
      getSettings(),
      getActiveRate(),
      getDailyMenuItemsForDate(dateStr),
      getDailyAdicionalesAsMenuItemsForDate(dateStr),
      getDailyBebidasAsMenuItemsForDate(dateStr),
      getDailyContornosAsMenuItemsForDate(dateStr),
    ]);

  // Group items by price tier
  const tierMap = new Map<number, MenuPdfItem[]>();
  for (const item of dailyItems) {
    const price = item.itemPriceUsdCents;
    if (!tierMap.has(price)) tierMap.set(price, []);
    tierMap.get(price)!.push({
      name: item.itemName,
      priceUsdCents: price,
      categoryName: item.categoryName,
      includedNote: (item as any).itemIncludedNote || null,
    });
  }

  // Build tiers sorted by price ascending
  const priceTiers = Array.from(tierMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([priceUsdCents, items]) => {
      // Check if all items share the same non-null includedNote
      const notes = items
        .map((i) => i.includedNote)
        .filter((n): n is string => !!n && n.trim().length > 0);
      const uniqueNotes = [...new Set(notes)];
      const sharedIncludedNote = uniqueNotes.length === 1 && notes.length === items.length
        ? uniqueNotes[0]
        : null;

      return { priceUsdCents, items, sharedIncludedNote };
    });

  return {
    restaurantName: settings?.restaurantName ?? "G&M",
    logoUrl: settings?.logoUrl ?? null,
    whatsappNumber: settings?.whatsappNumber ?? "",
    branchName: settings?.branchName ?? null,
    priceTiers,
    contornos: dailyContornos.map((c) => c.itemName),
    adicionales: dailyAdicionales.map((a) => ({
      name: a.itemName,
      priceUsdCents: a.itemPriceUsdCents,
    })),
    bebidas: dailyBebidas.map((b) => ({
      name: b.itemName,
      priceUsdCents: b.itemPriceUsdCents,
    })),
    rateBsPerUsd: rateInfo?.rate ?? 0,
    dateLabel: buildDateLabel(dateStr),
  };
}
