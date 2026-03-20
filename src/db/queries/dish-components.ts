import { db } from "../index";
import { dishComponents } from "../schema";
import { eq } from "drizzle-orm";

export async function getDishComponentsByMenuItemId(menuItemId: string) {
  return db
    .select()
    .from(dishComponents)
    .where(eq(dishComponents.menuItemId, menuItemId))
    .orderBy(dishComponents.sortOrder);
}

export async function upsertDishComponents(
  menuItemId: string,
  components: Array<{
    id?: string;
    name: string;
    type: "contorno" | "fixed";
    removable: boolean;
    priceIfRemovedCents: number | null;
    allowPaidSubstitution: boolean;
    sortOrder: number;
  }>,
) {
  // Delete existing components for this menu item
  await db
    .delete(dishComponents)
    .where(eq(dishComponents.menuItemId, menuItemId));

  if (components.length === 0) return [];

  // Insert new ones
  const inserted = await db
    .insert(dishComponents)
    .values(
      components.map((c) => ({
        menuItemId,
        name: c.name,
        type: c.type,
        removable: c.removable,
        priceIfRemovedCents: c.priceIfRemovedCents,
        allowPaidSubstitution: c.allowPaidSubstitution,
        sortOrder: c.sortOrder,
      })),
    )
    .returning();

  return inserted;
}
