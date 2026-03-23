"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setMenuItemBebidas as setMenuItemBebidasDb } from "@/db/queries/bebidas";

export async function saveMenuItemBebidas(
    menuItemId: string,
    bebidaItemIds: string[],
) {
    await requireAdmin();

    try {
        await setMenuItemBebidasDb(menuItemId, bebidaItemIds);
        revalidatePath("/");
        revalidatePath("/admin/catalogo");
        return { success: true };
    } catch {
        return { success: false, error: "Error al guardar bebidas del plato" };
    }
}
