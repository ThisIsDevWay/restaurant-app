"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCategory(name: string, allowAlone: boolean = true) {
  await requireAdmin();

  try {
    // Auto-assign sort_order as max + 1
    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)` })
      .from(categories);
    const nextSort = (maxRow?.max ?? -1) + 1;

    const [cat] = await db
      .insert(categories)
      .values({ name, sortOrder: nextSort, allowAlone })
      .returning();
    revalidatePath("/");
    revalidatePath("/admin/categories");
    return { success: true, category: cat };
  } catch {
    return { success: false, error: "Error al crear categoría" };
  }
}

export async function updateCategory(
  id: string,
  name: string,
  allowAlone: boolean = true,
) {
  await requireAdmin();

  try {
    await db
      .update(categories)
      .set({ name, allowAlone })
      .where(eq(categories.id, id));
    revalidatePath("/");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar categoría" };
  }
}

export async function getCategoryUsageCount(id: string): Promise<number> {
  await requireAdmin();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(menuItems)
    .where(eq(menuItems.categoryId, id));
  return Number(row?.count ?? 0);
}

export async function deleteCategory(id: string) {
  await requireAdmin();

  try {
    // Check for menu items
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(menuItems)
      .where(eq(menuItems.categoryId, id));

    const count = Number(row?.count ?? 0);
    if (count > 0) {
      return {
        success: false,
        error: `Esta categoría tiene ${count} plato${count !== 1 ? "s" : ""}. Reasígnalos antes de eliminar.`,
      };
    }

    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath("/");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar categoría" };
  }
}

export async function reorderCategories(orderedIds: string[]) {
  await requireAdmin();

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(categories)
        .set({ sortOrder: i })
        .where(eq(categories.id, orderedIds[i]));
    }
    revalidatePath("/");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Error al reordenar" };
  }
}

export async function toggleCategoryAvailability(id: string, isAvailable: boolean) {
  await requireAdmin();

  try {
    await db
      .update(categories)
      .set({ isAvailable })
      .where(eq(categories.id, id));
    revalidatePath("/");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar disponibilidad" };
  }
}
