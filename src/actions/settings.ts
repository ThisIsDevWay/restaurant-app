"use server";

import { requireAdmin } from "@/lib/auth";
import { updateSettings as updateSettingsDb } from "@/db/queries/settings";
import { settingsSchema } from "@/lib/validations/settings";
import * as v from "valibot";
import { revalidatePath } from "next/cache";

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
    const updatePayload = { ...parsed.output } as any;

    // Drizzle ignores undefined values in updates. To clear the manual rate,
    // we must explicitly send null to the database.
    if (updatePayload.rateOverrideBsPerUsd === undefined) {
      updatePayload.rateOverrideBsPerUsd = null;
    }

    await updateSettingsDb(updatePayload);
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar configuración" };
  }
}
