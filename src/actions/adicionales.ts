"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setMenuItemAdicionales as setMenuItemAdicionalesDb } from "@/db/queries/adicionales";

export async function saveMenuItemAdicionales(
  menuItemId: string,
  adicionalIds: string[],
) {
  await requireAdmin();

  try {
    await setMenuItemAdicionalesDb(menuItemId, adicionalIds);
    revalidatePath("/");
    revalidatePath("/admin/catalogo");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar adicionales del plato" };
  }
}
