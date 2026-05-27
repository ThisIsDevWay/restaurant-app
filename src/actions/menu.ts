"use server";

import { db } from "@/db";
import { menuItems, optionGroups, options, menuItemContornos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateMenuCache } from "@/db/queries/menu";
import { invalidateDailyMenuCache } from "@/db/queries/daily-menu";
import { menuItemSchema, optionGroupSchema } from "@/lib/validations/menu-item";
import * as v from "valibot";
import { adminActionClient } from "@/lib/safe-action";
import { deleteFile } from "@/lib/imagekit/server";

export const createMenuItemAction = adminActionClient
  .schema(menuItemSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { contornos = [], sortOrder, ...rest } = parsedInput;

      let resolvedSortOrder = sortOrder;
      if (resolvedSortOrder === undefined) {
        const lastItem = await db
          .select({ sortOrder: menuItems.sortOrder })
          .from(menuItems)
          .where(eq(menuItems.categoryId, rest.categoryId))
          .orderBy(desc(menuItems.sortOrder))
          .limit(1);
        resolvedSortOrder = (lastItem[0]?.sortOrder ?? 0) + 1;
      }

      const [item] = await db
        .insert(menuItems)
        .values({ ...rest, sortOrder: resolvedSortOrder })
        .returning();

      if (contornos.length > 0) {
        await db.insert(menuItemContornos).values(
          contornos.map((c) => ({
            menuItemId: item.id,
            contornoItemId: c.id,
            removable: c.removable,
          })),
        );
      }

      invalidateMenuCache();
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
      const { contornos = [], ...menuItemData } = data;

      // Read the current row to find the old imagekitFileId
      const [current] = await db
        .select({ imageUrl: menuItems.imageUrl, imagekitFileId: menuItems.imagekitFileId })
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      // If the image changed, delete the old ImageKit file (best-effort)
      if (
        current?.imagekitFileId &&
        current.imagekitFileId !== menuItemData.imagekitFileId
      ) {
        await deleteFile(current.imagekitFileId);
      }

      const updateData = {
        ...menuItemData,
        updatedAt: new Date(),
        ...(menuItemData.costUsdCents != null && { costUpdatedAt: new Date() }),
      };

      const [item] = await db
        .update(menuItems)
        .set(updateData)
        .where(eq(menuItems.id, id))
        .returning();

      // Sync contornos: full replace (delete + re-insert)
      await db.delete(menuItemContornos).where(eq(menuItemContornos.menuItemId, id));
      if (contornos.length > 0) {
        await db.insert(menuItemContornos).values(
          contornos.map((c) => ({
            menuItemId: id,
            contornoItemId: c.id,
            removable: c.removable,
          })),
        );
      }

      invalidateMenuCache();
      invalidateDailyMenuCache();
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
      const [row] = await db
        .select({ imagekitFileId: menuItems.imagekitFileId })
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      if (row?.imagekitFileId) {
        await deleteFile(row.imagekitFileId);
      }

      await db.delete(menuItems).where(eq(menuItems.id, id));
      invalidateMenuCache();
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

      invalidateMenuCache();
      return { success: true, group };
    } catch {
      return { success: false, error: "Error al crear grupo de opciones" };
    }
  });
