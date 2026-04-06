/**
 * Money utilities — all arithmetic with integers (cents), never floats.
 * Prices stored as usdCents (integers).
 * Bs. prices calculated as Math.round(usdCents * rateBsPerUsd).
 */

export function usdCentsToBsCents(
  usdCents: number,
  rateBsPerUsd: number,
): number {
  if (!Number.isFinite(usdCents) || !Number.isFinite(rateBsPerUsd) || rateBsPerUsd <= 0) {
    throw new Error(
      `usdCentsToBsCents: valores inválidos usdCents=${usdCents} rate=${rateBsPerUsd}`,
    );
  }
  return Math.round(usdCents * rateBsPerUsd);
}

/** "REF 3,10" — comma as decimal separator, no thousands separator.
 *  Returns "REF —" for null/undefined/NaN inputs. */
export function formatRef(usdCents: number | null | undefined): string {
  if (usdCents == null || !Number.isFinite(usdCents)) return "REF —";
  return `REF ${(usdCents / 100).toFixed(2).replace(".", ",")}`;
}

/** "Bs. 1.399,68" — dot for thousands, comma for decimals (Venezuelan convention).
 *  Returns "Bs. —" for null/undefined/NaN inputs. */
export function formatBs(bsCents: number | null | undefined): string {
  if (bsCents == null || !Number.isFinite(bsCents)) return "Bs. —";
  const value = bsCents / 100;
  return `Bs. ${value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Sum total of items in cents (integer arithmetic) */
export function totalFromItems(
  items: Array<{ priceCents: number; quantity: number }>,
): number {
  return items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
}

