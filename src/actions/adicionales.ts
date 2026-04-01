"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setMenuItemAdicionales as setMenuItemAdicionalesDb } from "@/db/queries/adicionales";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const saveMenuItemAdicionalesAction = adminActionClient
  .schema(v.object({ menuItemId: v.string(), adicionalIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { menuItemId, adicionalIds } }) => {
    try {
      await setMenuItemAdicionalesDb(menuItemId, adicionalIds);
      revalidatePath("/");
      revalidatePath("/admin/catalogo");
      return { success: true };
    } catch {
      return { success: false, error: "Error al guardar adicionales del plato" };
    }
  });


