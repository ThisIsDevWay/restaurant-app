"use server";

import { requireAdmin } from "@/lib/auth";
import {
  upsertTemplate,
  toggleTemplateActive,
} from "@/db/queries/whatsapp-templates";
import { revalidatePath } from "next/cache";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

type ActionResult =
  | { success: true; error?: never }
  | { success: false; error: string };

export const saveTemplateAction = adminActionClient
  .schema(v.object({ key: v.string(), body: v.string() }))
  .action(async ({ parsedInput: { key, body } }) => {
    if (!key || !body?.trim()) {
      return { success: false, error: "Key y body son requeridos" };
    }

    const validKeys = ["received", "paid", "kitchen", "delivered", "checkout_manual"];
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
  });



export const toggleTemplateAction = adminActionClient
  .schema(v.object({ key: v.string(), isActive: v.boolean() }))
  .action(async ({ parsedInput: { key, isActive } }) => {
    try {
      await toggleTemplateActive(key, isActive);
      revalidatePath("/admin/settings");
      return { success: true };
    } catch {
      return { success: false, error: "Error al actualizar plantilla" };
    }
  });


