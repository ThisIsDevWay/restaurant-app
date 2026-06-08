import { db } from "@/db";
import { categories, dailyAdicionales, dailyBebidas, dailyContornos, dailyMenuItems, menuItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function generateDailyMenuSnapshot(date: string) {
    // Daily adicionales pool
    const dailyAdicionalRows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isPrepackaged: menuItems.isPrepackaged,
            isAvailable: dailyAdicionales.isAvailable,
        })
        .from(dailyAdicionales)
        .innerJoin(menuItems, eq(dailyAdicionales.adicionalItemId, menuItems.id))
        .where(eq(dailyAdicionales.date, date));

    // Daily bebidas pool
    const dailyBebidaRows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isPrepackaged: menuItems.isPrepackaged,
            isAvailable: dailyBebidas.isAvailable,
        })
        .from(dailyBebidas)
        .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
        .where(eq(dailyBebidas.date, date));

    // Build lookup maps
    const dailyAdicionalMap = new Map(dailyAdicionalRows.map((a) => [a.id, a]));
    const dailyBebidaMap = new Map(dailyBebidaRows.map((b) => [b.id, b]));

    // Load daily contornos pool (for contorno substitutions)
    const dailyContornoRows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isPrepackaged: menuItems.isPrepackaged,
            isAvailable: dailyContornos.isAvailable,
        })
        .from(dailyContornos)
        .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
        .where(eq(dailyContornos.date, date));

    // Load always show contornos
    const alwaysShowContornoRows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isPrepackaged: menuItems.isPrepackaged,
            isAvailable: menuItems.isAvailable,
        })
        .from(menuItems)
        .innerJoin(categories, eq(menuItems.categoryId, categories.id))
        .where(
            and(
                eq(categories.name, "Contornos"),
                eq(menuItems.alwaysShowIfAssigned, true),
                eq(menuItems.isAvailable, true)
            )
        );

    const globalContornoMap = new Map();
    // Load always show contornos first
    for (const c of alwaysShowContornoRows) {
        globalContornoMap.set(c.id, c);
    }
    // Load daily contornos (overwriting alwaysShow with daily status if present)
    for (const c of dailyContornoRows) {
        globalContornoMap.set(c.id, c);
    }

    return { dailyAdicionalMap, dailyBebidaMap, globalContornoMap };
}

/**
 * Returns true only if the item exists in today's daily menu AND is marked available.
 * Items not present in daily_menu_items are treated as unavailable.
 */
export async function validateItemAvailability(itemId: string, date: string): Promise<boolean> {
    const [row] = await db
        .select({ isAvailable: dailyMenuItems.isAvailable })
        .from(dailyMenuItems)
        .where(
            and(
                eq(dailyMenuItems.menuItemId, itemId),
                eq(dailyMenuItems.date, date),
            ),
        )
        .limit(1);

    return row?.isAvailable === true;
}
