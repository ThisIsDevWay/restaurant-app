import type { MenuItemWithComponents } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";

/**
 * Computes which of today's contornos a dish's included sides may be swapped for.
 *
 * Extracted from the byte-identical `allowedSubstitutes` useMemo that used to live
 * in both ItemDetailModalClassic and ItemDetailModalModern. Pure function, no React.
 *
 * Rules (in order):
 *  1. If the dish's contornos declare explicit `substituteContornoIds`, only those
 *     (intersected with today's available daily contornos) are offered.
 *  2. Fallback: if no explicit substitutes are mapped but the dish has at least one
 *     removable contorno, offer every available daily contorno except the ones
 *     already included in the dish (prevents self-substitution).
 *  3. Otherwise, no substitutes.
 */
export function getAllowedSubstitutes(
  item: Pick<MenuItemWithComponents, "contornos">,
  dailyContornos: SimpleItem[] | undefined,
): SimpleItem[] {
  if (!dailyContornos || dailyContornos.length === 0) return [];

  const allowedIds = new Set<string>();
  item.contornos.forEach((c) => {
    if (c.substituteContornoIds) {
      c.substituteContornoIds.forEach((id) => allowedIds.add(id));
    }
  });

  if (allowedIds.size > 0) {
    return dailyContornos.filter((c) => allowedIds.has(c.id) && c.isAvailable);
  }

  const hasRemovable = item.contornos.some((c) => c.removable);
  if (!hasRemovable) return [];

  const includedIds = new Set(item.contornos.map((c) => c.id));
  return dailyContornos.filter((c) => !includedIds.has(c.id) && c.isAvailable);
}
