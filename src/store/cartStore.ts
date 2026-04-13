import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usdCentsToBsCents } from "@/lib/money";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";

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
    quantity: number;
  }>;
  selectedBebidas?: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
    quantity: number;
  }>;
  removedComponents: RemovedComponent[];
  quantity: number;
  itemTotalBsCents: number;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  categoryName: string;
}

interface CartState {
  items: CartItem[];
  cartDate: string | null;
  validItemIds: string[];
  checkoutToken: string | null;
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
  ensureCheckoutToken: () => string;
  clearCheckoutToken: () => void;
  recalculateBsPrices: (rateBsPerUsd: number) => void;
  syncWithMenu: (activeItems: MenuItem[]) => void;
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
    (sum, a) => sum + a.priceBsCents * (a.quantity ?? 1),
    0,
  );
  const bebidasBs = (item.selectedBebidas ?? []).reduce(
    (sum, b) => sum + b.priceBsCents * (b.quantity ?? 1),
    0,
  );
  const removalsBs = (item.removedComponents ?? []).reduce(
    (sum, r) => sum + Math.round(r.priceUsdCents * (item.baseBsCents / Math.max(item.baseUsdCents, 1))),
    0,
  );
  return (item.baseBsCents + fixedContornosBs + substitutionsBs + adicionalesBs + bebidasBs - removalsBs) * quantity;
}

/** Deterministic key for cart deduplication — order-insensitive */
function cartItemKey(item: Omit<CartItem, "quantity" | "itemTotalBsCents">): string {
  const contornoIds = (item.fixedContornos ?? []).map(c => c.id).sort().join(",");
  const subIds = (item.contornoSubstitutions ?? []).map(s => `${s.originalId}>${s.substituteId}`).sort().join(",");
  const adIds = (item.selectedAdicionales ?? []).map(a => `${a.id}:${a.quantity ?? 1}`).sort().join(",");
  const bebIds = (item.selectedBebidas ?? []).map(b => `${b.id}:${b.quantity ?? 1}`).sort().join(",");
  const remIds = (item.removedComponents ?? []).map(r => r.componentId).sort().join(",");
  return `${item.id}|${contornoIds}|${subIds}|${adIds}|${bebIds}|${remIds}`;
}

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (http, some mobile browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function computeItemUsdCents(
  item: Omit<CartItem, "quantity" | "itemTotalBsCents">,
): number {
  const fixedContornosUsd = (item.fixedContornos ?? []).reduce((sum, c) => sum + c.priceUsdCents, 0);
  const substitutionsUsd = (item.contornoSubstitutions ?? []).reduce((sum, s) => sum + s.priceUsdCents, 0);
  const adicionalesUsd = (item.selectedAdicionales ?? []).reduce(
    (sum, a) => sum + a.priceUsdCents * (a.quantity ?? 1),
    0,
  );
  const bebidasUsd = (item.selectedBebidas ?? []).reduce(
    (sum, b) => sum + b.priceUsdCents * (b.quantity ?? 1),
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
      cartDate: null,
      validItemIds: [],
      checkoutToken: null,
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

      clearCart: () => {
        set({ items: [] });
        get().clearCheckoutToken();
      },

      ensureCheckoutToken: () => {
        const current = get().checkoutToken;
        if (current) return current;

        const newToken = generateUUID();
        set({ checkoutToken: newToken });
        return newToken;
      },

      clearCheckoutToken: () => set({ checkoutToken: null }),

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

      syncWithMenu: (activeItems) => {
        const activeIds = activeItems.filter((m) => m.isAvailable).map((m) => m.id);
        const currentItems = get().items;
        const syncedItems = currentItems
          .filter((cartItem) => {
            const match = activeItems.find((m) => m.id === cartItem.id && m.isAvailable);
            return !!match;
          })
          .map((cartItem) => {
            const match = activeItems.find((m) => m.id === cartItem.id)!;
            // Solo actualizamos USD acá, el useEffect del componente se encargará de gatillar 
            // recalculateBsPrices(rate) para sincronizar Bs.
            if (cartItem.baseUsdCents !== match.priceUsdCents) {
              return {
                ...cartItem,
                baseUsdCents: match.priceUsdCents,
              };
            }
            return cartItem;
          });

        set({
          items: syncedItems,
          validItemIds: activeIds,
        });
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
        cartDate: state.cartDate,
        validItemIds: state.validItemIds,
        checkoutToken: state.checkoutToken,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;

        const todayCaracas = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Caracas",
        }).format(new Date());

        // 1. Expiración por fecha (limpieza total si es un día distinto)
        if (state.cartDate !== todayCaracas) {
          state.items = [];
          state.cartDate = todayCaracas;
          state.validItemIds = [];
          state.checkoutToken = null;
        }
        // 2. Filtrado atómico contra snapshot del catálogo previo
        // Esto evita el flash de items que ya sabíamos que no estaban disponibles
        else if (state.validItemIds.length > 0) {
          const validSet = new Set(state.validItemIds);
          state.items = state.items.filter((item) => validSet.has(item.id));
        }
      },
    },
  ),
);
