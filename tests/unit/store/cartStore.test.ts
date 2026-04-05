import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the persist middleware to do nothing
vi.mock("zustand/middleware", async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        persist: (config: any) => (set: any, get: any, api: any) => config(set, get, api),
    };
});

import { useCartStore, CartItem } from "@/store/cartStore";

describe("cartStore deduplication and pricing", () => {
    beforeEach(() => {
        useCartStore.getState().clearCart();
    });

    it("should deduplicate items with same components regardless of order", () => {
        const additional1 = { id: "a1", name: "Extra 1", priceUsdCents: 100, priceBsCents: 4000, quantity: 1 };
        const additional2 = { id: "a2", name: "Extra 2", priceUsdCents: 200, priceBsCents: 8000, quantity: 1 };

        const item1: Omit<CartItem, "quantity" | "itemTotalBsCents"> = {
            id: "item1",
            name: "Dish",
            emoji: "🍱",
            baseUsdCents: 1000,
            baseBsCents: 40000,
            fixedContornos: [],
            contornoSubstitutions: [],
            selectedAdicionales: [additional1, additional2],
            removedComponents: [],
            categoryAllowAlone: true,
            categoryIsSimple: false,
            categoryName: "Platos Fuertes",
        };

        const item2: Omit<CartItem, "quantity" | "itemTotalBsCents"> = {
            ...item1,
            selectedAdicionales: [additional2, additional1], // Order swapped
        };

        useCartStore.getState().addItem(item1);
        useCartStore.getState().addItem(item2);

        const state = useCartStore.getState();
        expect(state.items.length).toBe(1);
        expect(state.items[0].quantity).toBe(2);
    });

    it("should subtract removal prices from the total", () => {
        const itemWithRemoval: Omit<CartItem, "quantity" | "itemTotalBsCents"> = {
            id: "item1",
            name: "Dish",
            emoji: "🍱",
            baseUsdCents: 1000,
            baseBsCents: 40000,
            fixedContornos: [],
            contornoSubstitutions: [],
            selectedAdicionales: [],
            removedComponents: [
                { isRemoval: true, componentId: "c1", name: "No Onions", priceUsdCents: 50 }
            ],
            categoryAllowAlone: true,
            categoryIsSimple: false,
            categoryName: "Platos Fuertes",
        };

        // The current computeItemTotal in cartStore.ts uses:
        // removalsBs = Math.round(r.priceUsdCents * (item.baseBsCents / Math.max(item.baseUsdCents, 1)))
        // 50 * (40000 / 1000) = 50 * 40 = 2000 Bs cents
        // Total should be 40000 - 2000 = 38000

        useCartStore.getState().addItem(itemWithRemoval);
        const item = useCartStore.getState().items[0];

        expect(item.itemTotalBsCents).toBe(38000);
    });
});
