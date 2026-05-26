import { create } from "zustand";
import { usdCentsToBsCents } from "@/lib/money";
import type { CartItem } from "@/store/cartStore";

export type { CartItem } from "@/store/cartStore";

/**
 * POS cart for the internal waiter/caja screens. Deliberately mirrors useCartStore
 * but WITHOUT the persist middleware: a staff order should never survive a reload or
 * leak into the public customer cart (which lives under a separate localStorage key).
 */

function computeItemTotal(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
  quantity: number,
): number {
  const fixedContornosBs = (item.fixedContornos ?? []).reduce((s, c) => s + c.priceBsCents, 0);
  const substitutionsBs = (item.contornoSubstitutions ?? []).reduce((s, x) => s + x.priceBsCents, 0);
  const adicionalesBs = (item.selectedAdicionales ?? []).reduce(
    (s, a) => s + a.priceBsCents * (a.quantity ?? 1), 0);
  const bebidasBs = (item.selectedBebidas ?? []).reduce(
    (s, b) => s + b.priceBsCents * (b.quantity ?? 1), 0);
  const removalsBs = (item.removedComponents ?? []).reduce(
    (s, r) => s + Math.round(r.priceUsdCents * (item.baseBsCents / Math.max(item.baseUsdCents, 1))), 0);
  return (item.baseBsCents + fixedContornosBs + substitutionsBs - removalsBs) * quantity + adicionalesBs + bebidasBs;
}

function cartItemKey(item: Omit<CartItem, "quantity" | "itemTotalBsCents">): string {
  const contornoIds = (item.fixedContornos ?? []).map((c) => c.id).sort().join(",");
  const subIds = (item.contornoSubstitutions ?? []).map((s) => `${s.originalId}>${s.substituteId}`).sort().join(",");
  const adIds = (item.selectedAdicionales ?? []).map((a) => `${a.id}:${a.quantity ?? 1}`).sort().join(",");
  const bebIds = (item.selectedBebidas ?? []).map((b) => `${b.id}:${b.quantity ?? 1}`).sort().join(",");
  const remIds = (item.removedComponents ?? []).map((r) => r.componentId).sort().join(",");
  return `${item.id}|${contornoIds}|${subIds}|${adIds}|${bebIds}|${remIds}`;
}

interface POSCartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "itemTotalBsCents">) => void;
  removeItem: (index: number) => void;
  updateItem: (
    index: number,
    item: Omit<CartItem, "quantity" | "itemTotalBsCents"> & { quantity?: number; itemTotalBsCents?: number },
  ) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const usePOSCartStore = create<POSCartState>()((set, get) => ({
  items: [],

  addItem: (item) => {
    const existingIndex = get().items.findIndex((i) => cartItemKey(i) === cartItemKey(item));
    if (existingIndex !== -1) {
      const items = [...get().items];
      const existing = items[existingIndex];
      items[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
        itemTotalBsCents: computeItemTotal(existing, existing.quantity + 1),
      };
      set({ items });
    } else {
      set({
        items: [...get().items, { ...item, quantity: 1, itemTotalBsCents: computeItemTotal(item, 1) }],
      });
    }
  },

  removeItem: (index) => set({ items: get().items.filter((_, i) => i !== index) }),

  updateItem: (index, itemData) => {
    const items = [...get().items];
    if (index < 0 || index >= items.length) return;
    const newQuantity = itemData.quantity ?? items[index].quantity;
    items[index] = {
      ...itemData,
      quantity: newQuantity,
      itemTotalBsCents: computeItemTotal(itemData, newQuantity),
    };
    set({ items });
  },

  updateQuantity: (index, quantity) => {
    if (quantity <= 0) {
      get().removeItem(index);
      return;
    }
    const items = [...get().items];
    const item = items[index];
    items[index] = { ...item, quantity, itemTotalBsCents: computeItemTotal(item, quantity) };
    set({ items });
  },

  clearCart: () => set({ items: [] }),
  setItems: (items) => set({ items }),
}));
