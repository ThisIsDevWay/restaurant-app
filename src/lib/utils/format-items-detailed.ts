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
          ? "incluido"
          : `${formatPrice(item.priceBsCents)} / ${formatRef(item.priceUsdCents)}`;
      const header =
        item.quantity > 1
          ? `*${item.quantity}× ${item.name}*`
          : `*${item.name}*`;
      lines.push(header);
      lines.push(`Base · ${basePrice}`);

      // --- Contornos ---
      const hasFixedContornos = item.fixedContornos.length > 0;
      const substitutions = item.selectedAdicionales.filter(
        (a) => a.substitutesComponentId,
      );
      const hasContornos = hasFixedContornos || substitutions.length > 0;

      if (hasContornos) {
        lines.push(`Contornos`);
        for (const c of item.fixedContornos) {
          lines.push(`  ${c.name} · incluido`);
        }
        for (const s of substitutions) {
          const priceStr = s.priceBsCents > 0 ? `+ ${formatPrice(s.priceBsCents)}` : "incluido";
          lines.push(`  ${s.name} (en lugar de ${s.substitutesComponentName}) · ${priceStr}`);
        }
      }

      // --- Removidos ---
      if (item.removedComponents && item.removedComponents.length > 0) {
        lines.push(`Removido`);
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
          const priceStr = a.priceBsCents > 0 ? `+ ${formatPrice(a.priceBsCents)}` : "incluido";
          lines.push(`  ${a.name} · ${priceStr}`);
        }
      }

      // --- Bebidas ---
      if (item.selectedBebidas && item.selectedBebidas.length > 0) {
        lines.push(`Bebidas`);
        for (const b of item.selectedBebidas) {
          const priceStr = b.priceBsCents > 0 ? `+ ${formatPrice(b.priceBsCents)}` : "incluido";
          lines.push(`  ${b.name} · ${priceStr}`);
        }
      }

      // Item total
      lines.push(`💰 Total ítem: ${formatPrice(item.itemTotalBsCents * item.quantity)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}
