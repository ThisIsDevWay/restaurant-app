"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { menuItems, optionGroups, options } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { menuItemSchema, optionGroupSchema } from "@/lib/validations/menu-item";
import * as v from "valibot";
import { adminActionClient } from "@/lib/safe-action";

export const createMenuItemAction = adminActionClient
  .schema(menuItemSchema)
  .action(async ({ parsedInput }) => {
    try {
      if (parsedInput.sortOrder === undefined) {
        const lastItem = await db
          .select({ sortOrder: menuItems.sortOrder })
          .from(menuItems)
          .where(eq(menuItems.categoryId, parsedInput.categoryId))
          .orderBy(desc(menuItems.sortOrder))
          .limit(1);
        parsedInput.sortOrder = (lastItem[0]?.sortOrder ?? 0) + 1;
      }

      const [item] = await db.insert(menuItems).values(parsedInput).returning();
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/catalogo");
      return { success: true, item };
    } catch {
      return { success: false, error: "Error al crear item" };
    }
  });



export const updateMenuItemAction = adminActionClient
  .schema(v.object({ id: v.string(), data: menuItemSchema }))
  .action(async ({ parsedInput: { id, data } }) => {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
        ...(data.costUsdCents != null && { costUpdatedAt: new Date() }),
      };

      const [item] = await db
        .update(menuItems)
        .set(updateData)
        .where(eq(menuItems.id, id))
        .returning();
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/catalogo");
      return { success: true, item };
    } catch {
      return { success: false, error: "Error al actualizar item" };
    }
  });



export const deleteMenuItemAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      await db.delete(menuItems).where(eq(menuItems.id, id));
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/catalogo");
      return { success: true };
    } catch {
      return { success: false, error: "Error al eliminar item" };
    }
  });



export const createOptionGroupAction = adminActionClient
  .schema(v.object({ menuItemId: v.string(), data: optionGroupSchema }))
  .action(async ({ parsedInput: { menuItemId, data } }) => {
    try {
      const [group] = await db
        .insert(optionGroups)
        .values({
          menuItemId,
          name: data.name,
          type: data.type,
          required: data.required,
          sortOrder: data.sortOrder,
        })
        .returning();

      for (const opt of data.options) {
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
  });



export const generateUploadUrlAction = adminActionClient
  .schema(v.object({ fileName: v.string() }))
  .action(async ({ parsedInput: { fileName } }) => {
    const path = `menu/${Date.now()}-${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from("menu")
        .createSignedUploadUrl(path);

      if (error || !data) {
        return { success: false as const, error: "Error al generar URL de subida" };
      }

      return { success: true as const, url: data.signedUrl, path };
    } catch {
      return { success: false as const, error: "Error al generar URL de subida" };
    }
  });

export const getPublicUrlAction = adminActionClient
  .schema(v.object({ path: v.string() }))
  .action(async ({ parsedInput: { path } }) => {
    const { data } = supabase.storage.from("menu").getPublicUrl(path);
    return data.publicUrl;
  });
