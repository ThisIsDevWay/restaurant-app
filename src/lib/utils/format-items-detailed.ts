export interface SnapshotItem {
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  quantity: number;
  fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
    substitutesComponentId?: string;
    substitutesComponentName?: string;
  }>;
  selectedBebidas?: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  removedComponents?: Array<{
    isRemoval?: boolean;
    componentId?: string;
    name: string;
    priceUsdCents: number;
  }>;
  itemTotalBsCents: number;
}

/**
 * Formats items snapshot into a detailed WhatsApp-friendly string.
 * Mirrors the checkout accordion detail: contornos, substitutions, removed, adicionales, bebidas.
 */
export function formatItemsDetailed(
  items: SnapshotItem[],
  formatPrice: (bsCents: number) => string,
  formatRef: (usdCents: number) => string,
): string {
  return items
    .map((item) => {
      const lines: string[] = [];

      // Item header with base price
      const basePrice =
        item.priceUsdCents === 0
          ? "Incluido"
          : `${formatPrice(item.priceBsCents)} / ${formatRef(item.priceUsdCents)}`;
      const header =
        item.quantity > 1
          ? `*${item.quantity}× ${item.name}* (${basePrice} c/u)`
          : `*${item.name}* (${basePrice})`;
      lines.push(header);

      // --- Contornos ---
      const hasFixedContornos = item.fixedContornos.length > 0;
      const substitutions = item.selectedAdicionales.filter(
        (a) => a.substitutesComponentId,
      );
      const hasContornos = hasFixedContornos || substitutions.length > 0;

      if (hasContornos) {
        lines.push(`Contornos`);
        for (const c of item.fixedContornos) {
          lines.push(`  ${c.name}`);
        }
        for (const s of substitutions) {
          lines.push(
            `  ${s.name} (en vez de ${s.substitutesComponentName})`,
          );
        }
      }

      // --- Removidos ---
      if (item.removedComponents && item.removedComponents.length > 0) {
        for (const r of item.removedComponents) {
          lines.push(`  Sin ${r.name}`);
        }
      }

      // --- Adicionales (pure extras, no substitution) ---
      const pureAdicionales = item.selectedAdicionales.filter(
        (a) => !a.substitutesComponentId,
      );
      if (pureAdicionales.length > 0) {
        lines.push(`Adicionales`);
        for (const a of pureAdicionales) {
          const price =
            a.priceUsdCents === 0
              ? "Incluido"
              : `${formatPrice(a.priceBsCents)} / ${formatRef(a.priceUsdCents)}`;
          lines.push(`  + ${a.name}(${price})`);
        }
      }

      // --- Bebidas ---
      if (item.selectedBebidas && item.selectedBebidas.length > 0) {
        lines.push(`Bebidas`);
        for (const b of item.selectedBebidas) {
          const price =
            b.priceUsdCents === 0
              ? "Incluido"
              : `${formatPrice(b.priceBsCents)} / ${formatRef(b.priceUsdCents)}`;
          lines.push(`  + ${b.name}(${price})`);
        }
      }

      // Item total
      lines.push(`💰 ${formatPrice(item.itemTotalBsCents * item.quantity)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}
