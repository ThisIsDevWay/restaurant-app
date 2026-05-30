import { db } from "@/db";
import { dailyAdicionales, dailyBebidas, dailyContornos, dailyMenuItems, menuItems } from "@/db/schema";
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

    const globalContornoMap = new Map(dailyContornoRows.map((c) => [c.id, c]));

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
