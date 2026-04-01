import { db } from "@/db";
import { dailyAdicionales, dailyBebidas, dailyContornos, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateDailyMenuSnapshot(date: string) {
    // Daily adicionales pool
    const dailyAdicionalRows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isAvailable: menuItems.isAvailable,
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
            isAvailable: menuItems.isAvailable,
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
            isAvailable: menuItems.isAvailable,
        })
        .from(dailyContornos)
        .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
        .where(eq(dailyContornos.date, date));

    const globalContornoMap = new Map(dailyContornoRows.map((c) => [c.id, c]));

    return { dailyAdicionalMap, dailyBebidaMap, globalContornoMap };
}

export async function validateItemAvailability(itemId: string, date: string) {
    // Stub implementation if not fully defined in the previous design
    // In theory, checks if a menuItem is explicitly restricted or available in the daily snapshot
    return true;
}
