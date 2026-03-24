import { db } from "../index";
import { menuItemAdicionales, menuItems, categories } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllAdicionales() {
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
    .where(eq(categories.name, "Adicionales"))
    .orderBy(menuItems.sortOrder);
}

export async function getAdicionalesByMenuItemId(menuItemId: string) {
  const rows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(menuItems, eq(menuItemAdicionales.adicionalItemId, menuItems.id))
    .where(eq(menuItemAdicionales.menuItemId, menuItemId))
    .orderBy(menuItems.sortOrder);

  return rows;
}

export async function setMenuItemAdicionales(
  menuItemId: string,
  adicionalIds: string[],
) {
  // Delete all existing assignments for this menu item
  await db
    .delete(menuItemAdicionales)
    .where(eq(menuItemAdicionales.menuItemId, menuItemId));

  // Insert new assignments
  if (adicionalIds.length > 0) {
    await db.insert(menuItemAdicionales).values(
      adicionalIds.map((adicionalItemId) => ({
        menuItemId,
        adicionalItemId,
      })),
    );
  }
}

/** Count how many menu items reference this adicional */
export async function getAdicionalUsageCount(id: string): Promise<number> {
  const rows = await db
    .select({ menuItemId: menuItemAdicionales.menuItemId })
    .from(menuItemAdicionales)
    .where(eq(menuItemAdicionales.adicionalItemId, id));

  return rows.length;
}
