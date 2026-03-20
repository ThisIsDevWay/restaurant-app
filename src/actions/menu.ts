"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { menuItems, optionGroups, options } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { menuItemSchema, optionGroupSchema } from "@/lib/validations/menu-item";
import { upsertDishComponents } from "@/db/queries/dish-components";
import * as v from "valibot";

const dishComponentInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  type: v.picklist(["contorno", "fixed"]),
  removable: v.boolean(),
  priceIfRemovedCents: v.nullable(v.number()),
  allowPaidSubstitution: v.boolean(),
  sortOrder: v.number(),
});

export async function createMenuItem(data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(menuItemSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const [item] = await db
      .insert(menuItems)
      .values(parsed.output)
      .returning();
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true, item };
  } catch {
    return { success: false, error: "Error al crear item" };
  }
}

export async function updateMenuItem(id: string, data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(menuItemSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const [item] = await db
      .update(menuItems)
      .set({ ...parsed.output, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true, item };
  } catch {
    return { success: false, error: "Error al actualizar item" };
  }
}

export async function deleteMenuItem(id: string) {
  await requireAdmin();

  try {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar item" };
  }
}

export async function createOptionGroup(
  menuItemId: string,
  data: unknown,
) {
  await requireAdmin();

  const parsed = v.safeParse(optionGroupSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const [group] = await db
      .insert(optionGroups)
      .values({
        menuItemId,
        name: parsed.output.name,
        type: parsed.output.type,
        required: parsed.output.required,
        sortOrder: parsed.output.sortOrder,
      })
      .returning();

    for (const opt of parsed.output.options) {
      await db.insert(options).values({
        groupId: group.id,
        name: opt.name,
        priceUsdCents: opt.priceUsdCents,
        isAvailable: opt.isAvailable,
        sortOrder: opt.sortOrder,
      });
    }

    revalidatePath("/");
    return { success: true, group };
  } catch {
    return { success: false, error: "Error al crear grupo de opciones" };
  }
}

export async function generateUploadUrl(
  fileName: string,
): Promise<{ success: true; url: string; path: string } | { success: false; error: string }> {
  await requireAdmin();

  const path = `menu/${Date.now()}-${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from("menu")
      .createSignedUploadUrl(path);

    if (error || !data) {
      return { success: false, error: "Error al generar URL de subida" };
    }

    return { success: true, url: data.signedUrl, path };
  } catch {
    return { success: false, error: "Error al generar URL de subida" };
  }
}

export async function getPublicUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from("menu").getPublicUrl(path);
  return data.publicUrl;
}

export async function saveDishComponents(
  menuItemId: string,
  components: unknown[],
) {
  await requireAdmin();

  try {
    const parsed = components.map((c) => {
      const result = v.safeParse(dishComponentInputSchema, c);
      if (!result.success) throw new Error(result.issues[0].message);
      return result.output;
    });

    await upsertDishComponents(menuItemId, parsed);
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al guardar componentes",
    };
  }
}
