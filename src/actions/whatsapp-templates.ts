"use server";

import { requireAdmin } from "@/lib/auth";
import {
  upsertTemplate,
  toggleTemplateActive,
} from "@/db/queries/whatsapp-templates";
import { revalidatePath } from "next/cache";

type ActionResult =
  | { success: true; error?: never }
  | { success: false; error: string };

export async function saveTemplate(
  key: string,
  body: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!key || !body?.trim()) {
    return { success: false, error: "Key y body son requeridos" };
  }

  const validKeys = ["received", "paid", "kitchen", "delivered"];
  if (!validKeys.includes(key)) {
    return { success: false, error: "Key de plantilla inválida" };
  }

  if (body.length > 500) {
    return { success: false, error: "Máximo 500 caracteres" };
  }

  try {
    await upsertTemplate(key, body.trim());
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar plantilla" };
  }
}

export async function toggleTemplate(
  key: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  try {
    await toggleTemplateActive(key, isActive);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar plantilla" };
  }
}
