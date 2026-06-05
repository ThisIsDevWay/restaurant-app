"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { invalidateMenuCache } from "@/db/queries/menu";
import { invalidateDailyMenuCache } from "@/db/queries/daily-menu";
import {
  setMenuItemContornos as setMenuItemContornosDb,
} from "@/db/queries/contornos";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const saveMenuItemContornosAction = adminActionClient
  .schema(v.object({
    menuItemId: v.string(),
    items: v.array(v.object({
      contornoId: v.string(),
      removable: v.boolean(),
      substituteContornoIds: v.array(v.string())
    }))
  }))
  .action(async ({ parsedInput: { menuItemId, items } }) => {
    try {
      await setMenuItemContornosDb(
        menuItemId,
        items.map((item) => ({
          contornoItemId: item.contornoId,
          removable: item.removable,
          substituteContornoIds: item.substituteContornoIds,
        })),
      );
      invalidateMenuCache();
      invalidateDailyMenuCache();
      revalidatePath("/admin/catalogo");
      revalidatePath("/");
      return { success: true };
    } catch (error) {
      logger.error("Error saving contornos", { error: String(error), menuItemId });
      return { success: false, error: "Error al guardar contornos del plato" };
    }
  });

export const toggleContornoAlwaysShowAction = adminActionClient
  .schema(v.object({
    id: v.string(),
    alwaysShowIfAssigned: v.boolean(),
  }))
  .action(async ({ parsedInput: { id, alwaysShowIfAssigned } }) => {
    try {
      await db
        .update(menuItems)
        .set({ alwaysShowIfAssigned })
        .where(eq(menuItems.id, id));
      invalidateMenuCache();
      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      revalidatePath("/");
      return { success: true };
    } catch (error) {
      logger.error("Error toggling alwaysShowIfAssigned", { error: String(error), id, alwaysShowIfAssigned });
      return { success: false, error: "Error al actualizar visibilidad del contorno" };
    }
  });


