import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usdCentsToBsCents } from "@/lib/money";

export interface RemovedComponent {
  isRemoval: true;
  componentId: string;
  name: string;
  priceUsdCents: number;
}

export interface ContornoSubstitution {
  originalId: string;
  originalName: string;
  substituteId: string;
  substituteName: string;
  priceUsdCents: number;
  priceBsCents: number;
}

export interface CartItem {
  id: string;
  name: string;
  emoji: string;
  baseUsdCents: number;
  baseBsCents: number;
  fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  contornoSubstitutions: ContornoSubstitution[];
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  selectedBebidas?: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  removedComponents: RemovedComponent[];
  quantity: number;
  itemTotalBsCents: number;
  categoryAllowAlone: boolean;
}

interface CartState {
  items: CartItem[];
  mounted: boolean;
  isDrawerOpen: boolean;
  setMounted: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (
    item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
  ) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  recalculateBsPrices: (rateBsPerUsd: number) => void;
  totalBsCents: () => number;
  totalUsdCents: () => number;
  totalBsCentsFromRate: (rateBsPerUsd: number) => number;
  itemCount: () => number;
}

function computeItemTotal(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
  quantity: number,
): number {
  const fixedContornosBs = (item.fixedContornos ?? []).reduce((sum, c) => sum + c.priceBsCents, 0);
  const substitutionsBs = (item.contornoSubstitutions ?? []).reduce((sum, s) => sum + s.priceBsCents, 0);
  const adicionalesBs = (item.selectedAdicionales ?? []).reduce(
    (sum, a) => sum + a.priceBsCents,
    0,
  );
  const bebidasBs = (item.selectedBebidas ?? []).reduce(
    (sum, b) => sum + b.priceBsCents,
    0,
  );
  const removalsBs = (item.removedComponents ?? []).reduce(
    (sum, r) => sum + Math.round(r.priceUsdCents * (item.baseBsCents / Math.max(item.baseUsdCents, 1))),
    0,
  );
  return (item.baseBsCents + fixedContornosBs + substitutionsBs + adicionalesBs + bebidasBs + removalsBs) * quantity;
}

/** Deterministic key for cart deduplication — order-insensitive */
function cartItemKey(item: Omit<CartItem, "quantity" | "itemTotalBsCents">): string {
  const contornoIds = (item.fixedContornos ?? []).map(c => c.id).sort().join(",");
  const subIds = (item.contornoSubstitutions ?? []).map(s => `${s.originalId}>${s.substituteId}`).sort().join(",");
  const adIds = (item.selectedAdicionales ?? []).map(a => a.id).sort().join(",");
  const bebIds = (item.selectedBebidas ?? []).map(b => b.id).sort().join(",");
  const remIds = (item.removedComponents ?? []).map(r => r.componentId).sort().join(",");
  return `${item.id}|${contornoIds}|${subIds}|${adIds}|${bebIds}|${remIds}`;
}

function computeItemUsdCents(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
): number {
  const fixedContornosUsd = (item.fixedContornos ?? []).reduce((sum, c) => sum + c.priceUsdCents, 0);
  const substitutionsUsd = (item.contornoSubstitutions ?? []).reduce((sum, s) => sum + s.priceUsdCents, 0);
  const adicionalesUsd = (item.selectedAdicionales ?? []).reduce(
    (sum, a) => sum + a.priceUsdCents,
    0,
  );
  const bebidasUsd = (item.selectedBebidas ?? []).reduce(
    (sum, b) => sum + b.priceUsdCents,
    0,
  );
  const removalsUsd = (item.removedComponents ?? []).reduce(
    (sum, r) => sum + r.priceUsdCents,
    0,
  );
  return item.baseUsdCents + fixedContornosUsd + substitutionsUsd + adicionalesUsd + bebidasUsd + removalsUsd;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      mounted: false,
      isDrawerOpen: false,
      setMounted: () => set({ mounted: true }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set({ isDrawerOpen: !get().isDrawerOpen }),

      addItem: (item) => {
        const existingIndex = get().items.findIndex(
          (i) => cartItemKey(i) === cartItemKey(item)
        );

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
            items: [
              ...get().items,
              { ...item, quantity: 1, itemTotalBsCents: computeItemTotal(item, 1) },
            ],
          });
        }
      },

      removeItem: (index) => {
        set({ items: get().items.filter((_, i) => i !== index) });
      },

      updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index);
          return;
        }
        const items = [...get().items];
        const item = items[index];
        items[index] = {
          ...item,
          quantity,
          itemTotalBsCents: computeItemTotal(item, quantity),
        };
        set({ items });
      },

      clearCart: () => set({ items: [] }),

      recalculateBsPrices: (rateBsPerUsd: number) => {
        const items = get().items.map((item) => {
          const newBaseBsCents = usdCentsToBsCents(item.baseUsdCents, rateBsPerUsd);
          const fixedContornos = item.fixedContornos.map((c) => ({
            ...c,
            priceBsCents: usdCentsToBsCents(c.priceUsdCents, rateBsPerUsd),
          }));
          const contornoSubstitutions = item.contornoSubstitutions.map((s) => ({
            ...s,
            priceBsCents: usdCentsToBsCents(s.priceUsdCents, rateBsPerUsd),
          }));
          const selectedAdicionales = item.selectedAdicionales.map((a) => ({
            ...a,
            priceBsCents: usdCentsToBsCents(a.priceUsdCents, rateBsPerUsd),
          }));
          const selectedBebidas = (item.selectedBebidas ?? []).map((b) => ({
            ...b,
            priceBsCents: usdCentsToBsCents(b.priceUsdCents, rateBsPerUsd),
          }));
          const updatedItem = {
            ...item,
            baseBsCents: newBaseBsCents,
            fixedContornos,
            contornoSubstitutions,
            selectedAdicionales,
            selectedBebidas,
          };
          return {
            ...updatedItem,
            itemTotalBsCents: computeItemTotal(updatedItem, item.quantity),
          };
        });
        set({ items });
      },

      totalBsCents: () =>
        get().items.reduce((sum, i) => sum + i.itemTotalBsCents, 0),

      totalUsdCents: () =>
        get().items.reduce(
          (sum, i) => sum + computeItemUsdCents(i) * i.quantity,
          0,
        ),

      totalBsCentsFromRate: (rateBsPerUsd: number) =>
        usdCentsToBsCents(
          get().items.reduce(
            (sum, i) => sum + computeItemUsdCents(i) * i.quantity,
            0,
          ),
          rateBsPerUsd,
        ),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "gm-cart",
      partialize: (state) => ({
        items: state.items,
      }),
    },
  ),
);
