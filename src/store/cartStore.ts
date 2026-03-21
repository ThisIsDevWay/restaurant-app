import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RemovedComponent {
  isRemoval: true;
  componentId: string;
  name: string;
  priceUsdCents: number;
}

export interface CartItem {
  id: string;
  name: string;
  emoji: string;
  baseUsdCents: number;
  baseBsCents: number;
  selectedContorno: { id: string; name: string; priceUsdCents: number; priceBsCents: number } | null;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
    substitutesComponentId?: string;
    substitutesComponentName?: string;
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
  totalBsCents: () => number;
  totalUsdCents: () => number;
  itemCount: () => number;
}

function computeItemTotal(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
  quantity: number,
): number {
  const contornoBs = item.selectedContorno?.priceBsCents ?? 0;
  const adicionalesBs = (item.selectedAdicionales ?? []).reduce(
    (sum, a) => sum + a.priceBsCents,
    0,
  );
  const removalsBs = (item.removedComponents ?? []).reduce(
    (sum, r) => sum + Math.round(r.priceUsdCents * (item.baseBsCents / Math.max(item.baseUsdCents, 1))),
    0,
  );
  return (item.baseBsCents + contornoBs + adicionalesBs + removalsBs) * quantity;
}

function computeItemUsdCents(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
): number {
  const contornoUsd = item.selectedContorno?.priceUsdCents ?? 0;
  const adicionalesUsd = (item.selectedAdicionales ?? []).reduce(
    (sum, a) => sum + a.priceUsdCents,
    0,
  );
  const removalsUsd = (item.removedComponents ?? []).reduce(
    (sum, r) => sum + r.priceUsdCents,
    0,
  );
  return item.baseUsdCents + contornoUsd + adicionalesUsd + removalsUsd;
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
          (i) =>
            i.id === item.id &&
            JSON.stringify(i.selectedContorno) ===
              JSON.stringify(item.selectedContorno) &&
            JSON.stringify(i.selectedAdicionales ?? []) ===
              JSON.stringify(item.selectedAdicionales ?? []) &&
            JSON.stringify(i.removedComponents ?? []) ===
              JSON.stringify(item.removedComponents ?? []),
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

      totalBsCents: () =>
        get().items.reduce((sum, i) => sum + i.itemTotalBsCents, 0),

      totalUsdCents: () =>
        get().items.reduce(
          (sum, i) => sum + computeItemUsdCents(i) * i.quantity,
          0,
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
