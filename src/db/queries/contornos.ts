import { db } from "../index";
import { contornos, menuItemContornos, menuItems } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllContornos() {
  return db
    .select()
    .from(contornos)
    .orderBy(contornos.sortOrder);
}

export async function getContornosByMenuItemId(menuItemId: string) {
  const rows = await db
    .select({
      id: contornos.id,
      name: contornos.name,
      priceUsdCents: contornos.priceUsdCents,
      isAvailable: contornos.isAvailable,
      sortOrder: contornos.sortOrder,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(contornos, eq(menuItemContornos.contornoId, contornos.id))
    .where(eq(menuItemContornos.menuItemId, menuItemId))
    .orderBy(contornos.sortOrder);

  return rows;
}

export async function setMenuItemContornos(
  menuItemId: string,
  items: Array<{ contornoId: string; removable: boolean; substituteContornoIds: string[] }>,
) {
  await db
    .delete(menuItemContornos)
    .where(eq(menuItemContornos.menuItemId, menuItemId));

  if (items.length > 0) {
    await db.insert(menuItemContornos).values(
      items.map((item) => ({
        menuItemId,
        contornoId: item.contornoId,
        removable: item.removable,
        substituteContornoIds: item.substituteContornoIds,
      })),
    );
  }
}

export async function createContorno(data: {
  name: string;
  priceUsdCents: number;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  const [row] = await db
    .insert(contornos)
    .values({
      name: data.name,
      priceUsdCents: data.priceUsdCents,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();

  return row;
}

export async function updateContorno(
  id: string,
  data: {
    name?: string;
    priceUsdCents?: number;
    isAvailable?: boolean;
    sortOrder?: number;
  },
) {
  const [row] = await db
    .update(contornos)
    .set(data)
    .where(eq(contornos.id, id))
    .returning();

  return row;
}

export async function deleteContorno(id: string) {
  await db.delete(contornos).where(eq(contornos.id, id));
}

export async function getContornoUsageCount(id: string): Promise<number> {
  const rows = await db
    .select({ menuItemId: menuItemContornos.menuItemId })
    .from(menuItemContornos)
    .where(eq(menuItemContornos.contornoId, id));

  return rows.length;
}
