"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import {
  createAdicional as createAdicionalDb,
  updateAdicional as updateAdicionalDb,
  deleteAdicional as deleteAdicionalDb,
  setMenuItemAdicionales as setMenuItemAdicionalesDb,
  getAdicionalUsageCount,
  getAllAdicionales,
} from "@/db/queries/adicionales";

const adicionalSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido"), v.maxLength(100)),
  priceUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  isAvailable: v.boolean(),
  sortOrder: v.pipe(v.number(), v.integer()),
});

export async function createAdicional(data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(adicionalSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const row = await createAdicionalDb(parsed.output);
    revalidatePath("/admin/adicionales");
    revalidatePath("/");
    return { success: true, adicional: row };
  } catch {
    return { success: false, error: "Error al crear adicional" };
  }
}

export async function updateAdicional(id: string, data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(
    v.partial(adicionalSchema),
    data,
  );
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const row = await updateAdicionalDb(id, parsed.output);
    revalidatePath("/admin/adicionales");
    revalidatePath("/");
    return { success: true, adicional: row };
  } catch {
    return { success: false, error: "Error al actualizar adicional" };
  }
}

export async function deleteAdicional(id: string) {
  await requireAdmin();

  try {
    await deleteAdicionalDb(id);
    revalidatePath("/admin/adicionales");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar adicional" };
  }
}

export async function toggleAdicionalAvailability(id: string, isAvailable: boolean) {
  await requireAdmin();

  try {
    await updateAdicionalDb(id, { isAvailable });
    revalidatePath("/admin/adicionales");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar disponibilidad" };
  }
}

export async function getAdicionalUsage(id: string) {
  await requireAdmin();
  return getAdicionalUsageCount(id);
}

export async function reorderAdicionales(orderedIds: string[]) {
  await requireAdmin();

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await updateAdicionalDb(orderedIds[i], { sortOrder: i });
    }
    revalidatePath("/admin/adicionales");
    return { success: true };
  } catch {
    return { success: false, error: "Error al reordenar" };
  }
}

export async function saveMenuItemAdicionales(
  menuItemId: string,
  adicionalIds: string[],
) {
  await requireAdmin();

  try {
    await setMenuItemAdicionalesDb(menuItemId, adicionalIds);
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar adicionales del plato" };
  }
}
