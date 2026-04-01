"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  setMenuItemContornos as setMenuItemContornosDb,
} from "@/db/queries/contornos";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

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
      revalidatePath("/");
      revalidatePath("/admin/catalogo");
      return { success: true };
    } catch (error) {
      console.error("Error saving contornos:", error);
      return { success: false, error: "Error al guardar contornos del plato" };
    }
  });


