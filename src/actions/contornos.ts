"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import {
  createContorno as createContornoDb,
  updateContorno as updateContornoDb,
  deleteContorno as deleteContornoDb,
  setMenuItemContornos as setMenuItemContornosDb,
  getContornoUsageCount,
  getAllContornos,
} from "@/db/queries/contornos";

const contornoSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido"), v.maxLength(100)),
  priceUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  isAvailable: v.boolean(),
  sortOrder: v.pipe(v.number(), v.integer()),
});

export async function createContorno(data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(contornoSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const row = await createContornoDb(parsed.output);
    revalidatePath("/admin/contornos");
    revalidatePath("/");
    return { success: true, contorno: row };
  } catch {
    return { success: false, error: "Error al crear contorno" };
  }
}

export async function updateContorno(id: string, data: unknown) {
  await requireAdmin();

  const parsed = v.safeParse(
    v.partial(contornoSchema),
    data,
  );
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    const row = await updateContornoDb(id, parsed.output);
    revalidatePath("/admin/contornos");
    revalidatePath("/");
    return { success: true, contorno: row };
  } catch {
    return { success: false, error: "Error al actualizar contorno" };
  }
}

export async function deleteContorno(id: string) {
  await requireAdmin();

  try {
    await deleteContornoDb(id);
    revalidatePath("/admin/contornos");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar contorno" };
  }
}

export async function toggleContornoAvailability(id: string, isAvailable: boolean) {
  await requireAdmin();

  try {
    await updateContornoDb(id, { isAvailable });
    revalidatePath("/admin/contornos");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar disponibilidad" };
  }
}

export async function getContornoUsage(id: string) {
  await requireAdmin();
  return getContornoUsageCount(id);
}

export async function reorderContornos(orderedIds: string[]) {
  await requireAdmin();

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await updateContornoDb(orderedIds[i], { sortOrder: i });
    }
    revalidatePath("/admin/contornos");
    return { success: true };
  } catch {
    return { success: false, error: "Error al reordenar" };
  }
}

export async function saveMenuItemContornos(
  menuItemId: string,
  items: Array<{ contornoId: string; removable: boolean; substituteContornoIds: string[] }>,
) {
  await requireAdmin();

  try {
    await setMenuItemContornosDb(menuItemId, items);
    revalidatePath("/");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar contornos del plato" };
  }
}
