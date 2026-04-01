"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const createCategoryAction = adminActionClient
  .schema(v.object({
    name: v.string(),
    allowAlone: v.optional(v.boolean(), true),
    isSimple: v.optional(v.boolean(), false)
  }))
  .action(async ({ parsedInput: { name, allowAlone, isSimple } }) => {
    try {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)` })
        .from(categories);
      const nextSort = (maxRow?.max ?? -1) + 1;

      const [cat] = await db
        .insert(categories)
        .values({ name, sortOrder: nextSort, allowAlone, isSimple })
        .returning();
      revalidatePath("/");
      revalidatePath("/admin/categories");
      return { success: true, category: cat };
    } catch {
      return { success: false, error: "Error al crear categoría" };
    }
  });



export const updateCategoryAction = adminActionClient
  .schema(v.object({
    id: v.string(),
    name: v.string(),
    allowAlone: v.optional(v.boolean(), true),
    isSimple: v.optional(v.boolean(), false)
  }))
  .action(async ({ parsedInput: { id, name, allowAlone, isSimple } }) => {
    try {
      await db
        .update(categories)
        .set({ name, allowAlone, isSimple })
        .where(eq(categories.id, id));
      revalidatePath("/");
      revalidatePath("/admin/categories");
      return { success: true };
    } catch {
      return { success: false, error: "Error al actualizar categoría" };
    }
  });



export const toggleCategorySimpleAction = adminActionClient
  .schema(v.object({ id: v.string(), isSimple: v.boolean() }))
  .action(async ({ parsedInput: { id, isSimple } }) => {
    try {
      await db
        .update(categories)
        .set({ isSimple })
        .where(eq(categories.id, id));
      revalidatePath("/");
      revalidatePath("/admin/categories");
      return { success: true };
    } catch {
      return { success: false, error: "Error al actualizar tipo de categoría" };
    }
  });



export const getCategoryUsageCount = async (id: string): Promise<number> => {
  await requireAdmin();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(menuItems)
    .where(eq(menuItems.categoryId, id));
  return Number(row?.count ?? 0);
}

export const deleteCategoryAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput: { id } }) => {
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
  });



export const reorderCategoriesAction = adminActionClient
  .schema(v.object({ orderedIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { orderedIds } }) => {
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
  });



export const toggleCategoryAvailabilityAction = adminActionClient
  .schema(v.object({ id: v.string(), isAvailable: v.boolean() }))
  .action(async ({ parsedInput: { id, isAvailable } }) => {
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
  });



export const toggleCategoryAloneAction = adminActionClient
  .schema(v.object({ id: v.string(), allowAlone: v.boolean() }))
  .action(async ({ parsedInput: { id, allowAlone } }) => {
    try {
      await db
        .update(categories)
        .set({ allowAlone })
        .where(eq(categories.id, id));
      revalidatePath("/");
      revalidatePath("/admin/categories");
      return { success: true };
    } catch {
      return { success: false, error: "Error al actualizar restricción" };
    }
  });


