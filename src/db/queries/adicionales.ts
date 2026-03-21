import { db } from "../index";
import { adicionales, menuItemAdicionales, menuItems } from "../schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getAllAdicionales() {
  return db
    .select()
    .from(adicionales)
    .orderBy(adicionales.sortOrder);
}

export async function getAdicionalesByMenuItemId(menuItemId: string) {
  const rows = await db
    .select({
      id: adicionales.id,
      name: adicionales.name,
      priceUsdCents: adicionales.priceUsdCents,
      isAvailable: adicionales.isAvailable,
      sortOrder: adicionales.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(adicionales, eq(menuItemAdicionales.adicionalId, adicionales.id))
    .where(eq(menuItemAdicionales.menuItemId, menuItemId))
    .orderBy(adicionales.sortOrder);

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
      adicionalIds.map((adicionalId) => ({
        menuItemId,
        adicionalId,
      })),
    );
  }
}

export async function createAdicional(data: {
  name: string;
  priceUsdCents: number;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  const [row] = await db
    .insert(adicionales)
    .values({
      name: data.name,
      priceUsdCents: data.priceUsdCents,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();

  return row;
}

export async function updateAdicional(
  id: string,
  data: {
    name?: string;
    priceUsdCents?: number;
    isAvailable?: boolean;
    sortOrder?: number;
  },
) {
  const [row] = await db
    .update(adicionales)
    .set(data)
    .where(eq(adicionales.id, id))
    .returning();

  return row;
}

export async function deleteAdicional(id: string) {
  await db.delete(adicionales).where(eq(adicionales.id, id));
}

/** Count how many menu items reference this adicional */
export async function getAdicionalUsageCount(id: string): Promise<number> {
  const rows = await db
    .select({ menuItemId: menuItemAdicionales.menuItemId })
    .from(menuItemAdicionales)
    .where(eq(menuItemAdicionales.adicionalId, id));

  return rows.length;
}
