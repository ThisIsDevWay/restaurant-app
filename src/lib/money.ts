/**
 * Money utilities — all arithmetic with integers (cents), never floats.
 * Prices stored as usdCents (integers).
 * Bs. prices calculated as Math.round(usdCents * rateBsPerUsd).
 */

export function usdCentsToBsCents(
  usdCents: number,
  rateBsPerUsd: number,
): number {
  return Math.round(usdCents * rateBsPerUsd);
}

/** "REF 3,10" — comma as decimal separator, no thousands separator */
export function formatRef(usdCents: number): string {
  return `REF ${(usdCents / 100).toFixed(2).replace(".", ",")}`;
}

/** "Bs. 1.399,68" — dot for thousands, comma for decimals (Venezuelan convention) */
export function formatBs(bsCents: number): string {
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
