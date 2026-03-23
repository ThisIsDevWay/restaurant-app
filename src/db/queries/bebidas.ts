import { db } from "../index";
import { menuItemBebidas, menuItems, categories } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllBebidas() {
    // Return menu items from categories where isSimple is true
    return db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isAvailable: menuItems.isAvailable,
            sortOrder: menuItems.sortOrder,
        })
        .from(menuItems)
        .innerJoin(categories, eq(menuItems.categoryId, categories.id))
        .where(eq(categories.name, "Bebidas")) // Hardcoding Bebidas for now as per design
        .orderBy(menuItems.sortOrder);
}

export async function getBebidasByMenuItemId(menuItemId: string) {
    const rows = await db
        .select({
            id: menuItems.id,
            name: menuItems.name,
            priceUsdCents: menuItems.priceUsdCents,
            isAvailable: menuItems.isAvailable,
            sortOrder: menuItems.sortOrder,
        })
        .from(menuItemBebidas)
        .innerJoin(menuItems, eq(menuItemBebidas.bebidaItemId, menuItems.id))
        .where(eq(menuItemBebidas.menuItemId, menuItemId))
        .orderBy(menuItems.sortOrder);

    return rows;
}

export async function setMenuItemBebidas(
    menuItemId: string,
    bebidaItemIds: string[],
) {
    // Delete all existing assignments for this menu item
    await db
        .delete(menuItemBebidas)
        .where(eq(menuItemBebidas.menuItemId, menuItemId));

    // Insert new assignments
    if (bebidaItemIds.length > 0) {
        await db.insert(menuItemBebidas).values(
            bebidaItemIds.map((bebidaItemId) => ({
                menuItemId,
                bebidaItemId,
            })),
        );
    }
}
