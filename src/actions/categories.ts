"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCategory(
  name: string,
  sortOrder: number,
  allowAlone: boolean = true,
) {
  await requireAdmin();

  try {
    const [cat] = await db
      .insert(categories)
      .values({ name, sortOrder, allowAlone })
      .returning();
    revalidatePath("/");
    return { success: true, category: cat };
  } catch {
    return { success: false, error: "Error al crear categoría" };
  }
}

export async function updateCategory(
  id: string,
  name: string,
  sortOrder: number,
  allowAlone: boolean = true,
) {
  await requireAdmin();

  try {
    await db
      .update(categories)
      .set({ name, sortOrder, allowAlone })
      .where(eq(categories.id, id));
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar categoría" };
  }
}

export async function deleteCategory(id: string) {
  await requireAdmin();

  try {
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar categoría" };
  }
}
