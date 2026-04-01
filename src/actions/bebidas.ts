"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setMenuItemBebidas as setMenuItemBebidasDb } from "@/db/queries/bebidas";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const saveMenuItemBebidasAction = adminActionClient
    .schema(v.object({ menuItemId: v.string(), bebidaItemIds: v.array(v.string()) }))
    .action(async ({ parsedInput: { menuItemId, bebidaItemIds } }) => {
        try {
            await setMenuItemBebidasDb(menuItemId, bebidaItemIds);
            revalidatePath("/");
            revalidatePath("/admin/catalogo");
            return { success: true };
        } catch {
            return { success: false, error: "Error al guardar bebidas del plato" };
        }
    });


