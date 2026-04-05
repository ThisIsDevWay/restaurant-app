/**
 * Tests unitarios para la logica de ordenamiento del menu diario.
 *
 * Verifica que sortDailyMenuItems ordene correctamente los items
 * segun el menuItemSortMode configurado.
 *
 * Escenarios probados:
 * - custom: respeta sortOrder de categorias y items
 * - price_asc: platos principales ordenados de menor a mayor precio
 * - price_desc: platos principales ordenados de mayor a menor precio
 * - Accesorios (isSimple=true) siempre van al final
 * - Null safety en itemPriceUsdCents
 * - Default a 'custom' cuando sortMode no se especifica
 */
import { describe, it, expect } from "vitest";
import { sortDailyMenuItems, type DailyMenuItemForSorting, type MenuItemSortMode } from "@/db/queries/sort-utils";

// Helper to create mock daily menu items
function mockItem(overrides: Partial<DailyMenuItemForSorting> & { name: string }): DailyMenuItemForSorting & { name: string } {
    return {
        name: overrides.name ?? "Test",
        categoryIsSimple: overrides.categoryIsSimple ?? false,
        categorySortOrder: overrides.categorySortOrder ?? 0,
        itemPriceUsdCents: overrides.itemPriceUsdCents ?? 1000,
        sortOrder: overrides.sortOrder ?? 0,
    };
}

describe("sortDailyMenuItems", () => {
    describe("sortMode: custom", () => {
        it("ordena por categorySortOrder y luego sortOrder", () => {
            const items = [
                mockItem({ name: "A", itemPriceUsdCents: 1500, categorySortOrder: 2, sortOrder: 1 }),
                mockItem({ name: "B", itemPriceUsdCents: 800, categorySortOrder: 1, sortOrder: 1 }),
                mockItem({ name: "C", itemPriceUsdCents: 1200, categorySortOrder: 1, sortOrder: 2 }),
            ];

            const sorted = sortDailyMenuItems(items, "custom");

            expect(sorted[0].name).toBe("B");  // catOrder=1, sortOrder=1
            expect(sorted[1].name).toBe("C");  // catOrder=1, sortOrder=2
            expect(sorted[2].name).toBe("A");  // catOrder=2
        });
    });

    describe("sortMode: price_asc", () => {
        it("ordena platos principales de menor a mayor precio", () => {
            const items = [
                mockItem({ name: "Caro", itemPriceUsdCents: 3000, categorySortOrder: 0, sortOrder: 1 }),
                mockItem({ name: "Barato", itemPriceUsdCents: 500, categorySortOrder: 0, sortOrder: 2 }),
                mockItem({ name: "Medio", itemPriceUsdCents: 1500, categorySortOrder: 0, sortOrder: 3 }),
            ];

            const sorted = sortDailyMenuItems(items, "price_asc");

            expect(sorted[0].name).toBe("Barato");   // 500
            expect(sorted[1].name).toBe("Medio");    // 1500
            expect(sorted[2].name).toBe("Caro");     // 3000
        });

        it("mantiene accesorios (isSimple=true) al final independientemente del precio", () => {
            const items = [
                mockItem({ name: "Plato Principal", itemPriceUsdCents: 2000, categorySortOrder: 0, categoryIsSimple: false, sortOrder: 1 }),
                mockItem({ name: "Bebida Barata", itemPriceUsdCents: 100, categorySortOrder: 1, categoryIsSimple: true, sortOrder: 1 }),
                mockItem({ name: "Plato Economico", itemPriceUsdCents: 800, categorySortOrder: 0, categoryIsSimple: false, sortOrder: 2 }),
            ];

            const sorted = sortDailyMenuItems(items, "price_asc");

            // Main dishes first (sorted by price), then accessories
            expect(sorted[0].name).toBe("Plato Economico");  // 800, main
            expect(sorted[1].name).toBe("Plato Principal");  // 2000, main
            expect(sorted[2].name).toBe("Bebida Barata");    // 100, accessory → goes last
        });
    });

    describe("sortMode: price_desc", () => {
        it("ordena platos principales de mayor a menor precio", () => {
            const items = [
                mockItem({ name: "Barato", itemPriceUsdCents: 500, categorySortOrder: 0, sortOrder: 1 }),
                mockItem({ name: "Caro", itemPriceUsdCents: 3000, categorySortOrder: 0, sortOrder: 2 }),
                mockItem({ name: "Medio", itemPriceUsdCents: 1500, categorySortOrder: 0, sortOrder: 3 }),
            ];

            const sorted = sortDailyMenuItems(items, "price_desc");

            expect(sorted[0].name).toBe("Caro");      // 3000
            expect(sorted[1].name).toBe("Medio");     // 1500
            expect(sorted[2].name).toBe("Barato");    // 500
        });
    });

    describe("null safety", () => {
        it("maneja itemPriceUsdCents null sin romper el sort", () => {
            const items: (DailyMenuItemForSorting & { name: string })[] = [
                { name: "Sin Precio", categoryIsSimple: false, categorySortOrder: 0, itemPriceUsdCents: null, sortOrder: 1 },
                mockItem({ name: "Con Precio", itemPriceUsdCents: 1000, categorySortOrder: 0, sortOrder: 2 }),
            ];

            // Should not throw — null treated as 0
            const sorted = sortDailyMenuItems(items, "price_asc");

            expect(sorted[0].name).toBe("Sin Precio");  // null → 0
            expect(sorted[1].name).toBe("Con Precio");   // 1000
        });
    });

    describe("default sortMode", () => {
        it("usa 'custom' cuando sortMode no se especifica", () => {
            const items = [
                mockItem({ name: "A", itemPriceUsdCents: 100, categorySortOrder: 2, sortOrder: 1 }),
                mockItem({ name: "B", itemPriceUsdCents: 200, categorySortOrder: 1, sortOrder: 1 }),
            ];

            const sorted = sortDailyMenuItems(items);

            // Custom sort: by categorySortOrder, not by price
            expect(sorted[0].name).toBe("B");  // categorySortOrder=1
            expect(sorted[1].name).toBe("A");  // categorySortOrder=2
        });
    });

    describe("edge cases", () => {
        it("retorna array vacio para input vacio", () => {
            const sorted = sortDailyMenuItems([], "price_asc");
            expect(sorted).toEqual([]);
        });

        it("no muta el array original", () => {
            const original = [
                mockItem({ name: "A", itemPriceUsdCents: 3000, categorySortOrder: 0, sortOrder: 1 }),
                mockItem({ name: "B", itemPriceUsdCents: 500, categorySortOrder: 0, sortOrder: 2 }),
            ];

            sortDailyMenuItems(original, "price_asc");

            // Original order preserved
            expect(original[0].name).toBe("A");
            expect(original[1].name).toBe("B");
        });

        it("todos los modos validos funcionan sin error", () => {
            const items = [
                mockItem({ name: "A", itemPriceUsdCents: 1000, categorySortOrder: 0, sortOrder: 1 }),
                mockItem({ name: "B", itemPriceUsdCents: 2000, categorySortOrder: 0, sortOrder: 2 }),
            ];

            const modes: MenuItemSortMode[] = ["custom", "price_asc", "price_desc"];
            for (const mode of modes) {
                const sorted = sortDailyMenuItems(items, mode);
                expect(sorted).toHaveLength(2);
            }
        });
    });
});
