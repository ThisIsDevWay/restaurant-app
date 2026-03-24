"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  setMenuItemContornos as setMenuItemContornosDb,
} from "@/db/queries/contornos";

export async function saveMenuItemContornos(
  menuItemId: string,
  items: Array<{ contornoId: string; removable: boolean; substituteContornoIds: string[] }>,
) {
  await requireAdmin();

  try {
    // Map contornoId (from frontend) to contornoItemId (expected by DB query)
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
}
