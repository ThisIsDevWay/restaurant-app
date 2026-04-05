import { sql, asc, desc, SQL } from "drizzle-orm";
import { menuItems, categories } from "../schema";

export type MenuItemSortMode = "custom" | "price_asc" | "price_desc";

/**
 * Builds the orderBy columns for menu items based on the provided sort mode.
 * Centralizes sorting logic to ensure consistency across different queries.
 */
export function buildMenuItemSortColumns(sortMode: MenuItemSortMode = "custom"): SQL<unknown>[] {
    const columns: SQL<unknown>[] = [];

    if (sortMode === "custom") {
        // We wrap columns in sql`` to satisfy the SQL<unknown> type requirement
        // which is needed for dynamic orderBy arrays in many Drizzle contexts.
        columns.push(sql`${categories.sortOrder}`);
    } else if (sortMode === "price_asc") {
        columns.push(asc(menuItems.priceUsdCents));
    } else if (sortMode === "price_desc") {
        columns.push(desc(menuItems.priceUsdCents));
    }

    // Final fallback to the menu items internal sort order
    columns.push(sql`${menuItems.sortOrder}`);

    return columns;
}

/**
 * Shape of a daily menu item for in-memory sorting.
 * Used by both daily-menu.ts and its tests.
 */
export interface DailyMenuItemForSorting {
    categoryIsSimple: boolean;
    categorySortOrder: number;
    itemPriceUsdCents: number | null;
    sortOrder: number;
}

/**
 * Pure function for sorting daily menu items in memory.
 * Extracted from getDailyMenuWithOptionsAndComponents for testability.
 *
 * Rules:
 * 1. Accessories (isSimple=true) always go to the end
 * 2. Main dishes sort by price (asc/desc) or custom
 * 3. Fallback to categorySortOrder then sortOrder
 */
export function sortDailyMenuItems<T extends DailyMenuItemForSorting>(
    items: T[],
    sortMode: MenuItemSortMode = "custom",
): T[] {
    const sorted = [...items];
    sorted.sort((a, b) => {
        // 1. Group accessories at the end
        if (a.categoryIsSimple !== b.categoryIsSimple) {
            return a.categoryIsSimple ? 1 : -1;
        }

        // 2. Only apply price sorting to main dishes
        if (!a.categoryIsSimple) {
            const priceA = a.itemPriceUsdCents ?? 0;
            const priceB = b.itemPriceUsdCents ?? 0;
            if (sortMode === "price_asc") return priceA - priceB;
            if (sortMode === "price_desc") return priceB - priceA;
        }

        // 3. Fallback to default sort order
        if (a.categorySortOrder !== b.categorySortOrder) return a.categorySortOrder - b.categorySortOrder;
        return a.sortOrder - b.sortOrder;
    });
    return sorted;
}
