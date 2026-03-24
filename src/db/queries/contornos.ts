import { db } from "../index";
import { categories, menuItemContornos, menuItems } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllContornos() {
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
    .where(eq(categories.name, "Contornos"))
    .orderBy(menuItems.sortOrder);
}

export async function getContornosByMenuItemId(menuItemId: string) {
  const rows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
    .where(eq(menuItemContornos.menuItemId, menuItemId))
    .orderBy(menuItems.sortOrder);

  return rows;
}

export async function setMenuItemContornos(
  menuItemId: string,
  items: Array<{ contornoItemId: string; removable: boolean; substituteContornoIds: string[] }>,
) {
  await db
    .delete(menuItemContornos)
    .where(eq(menuItemContornos.menuItemId, menuItemId));

  if (items.length > 0) {
    await db.insert(menuItemContornos).values(
      items.map((item) => ({
        menuItemId,
        contornoItemId: item.contornoItemId,
        removable: item.removable,
        substituteContornoIds: item.substituteContornoIds,
      })),
    );
  }
}

export async function getContornoUsageCount(id: string): Promise<number> {
  const rows = await db
    .select({ menuItemId: menuItemContornos.menuItemId })
    .from(menuItemContornos)
    .where(eq(menuItemContornos.contornoItemId, id));

  return rows.length;
}
