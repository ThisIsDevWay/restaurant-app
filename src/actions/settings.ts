"use server";

import { requireAdmin } from "@/lib/auth";
import { updateSettings as updateSettingsDb } from "@/db/queries/settings";
import { settingsSchema } from "@/lib/validations/settings";
import * as v from "valibot";

type ActionResult =
  | { success: true; error?: never }
  | { success: false; error: string };

export async function saveSettings(data: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = v.safeParse(settingsSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.issues[0].message };
  }

  try {
    await updateSettingsDb(parsed.output);
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar configuración" };
  }
}
