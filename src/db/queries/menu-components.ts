import { db } from "../index";
import { menuItems, menuItemContornos, categories } from "../schema";
import { eq, and, asc, isNotNull, sql } from "drizzle-orm";

/** All contornos currently assigned to a menu item (for the edit form). */
export async function getMenuItemContornos(menuItemId: string) {
  return db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      removable: menuItemContornos.removable,
    })
    .from(menuItemContornos)
    .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
    .where(eq(menuItemContornos.menuItemId, menuItemId))
    .orderBy(menuItems.sortOrder);
}

/** All available menu items from isSimple categories — used as the contorno picker pool. */
export async function getSimpleMenuItems() {
  return db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      categoryName: categories.name,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(and(eq(categories.isSimple, true), eq(menuItems.isAvailable, true)))
    .orderBy(asc(categories.sortOrder), asc(menuItems.sortOrder));
}

export async function getStaleCostItems(days: number = 7) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      costUsdCents: menuItems.costUsdCents,
      costUpdatedAt: menuItems.costUpdatedAt,
    })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.isAvailable, true),
        isNotNull(menuItems.costUsdCents),
        sql`${menuItems.costUpdatedAt} IS NULL OR ${menuItems.costUpdatedAt} < ${threshold.toISOString()}`,
      ),
    )
    .orderBy(asc(menuItems.costUpdatedAt));
}
