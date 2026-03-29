"use server";

import { requireAdmin } from "@/lib/auth";
import { updateSettings as updateSettingsDb, getActiveRate, getSettings } from "@/db/queries/settings";
import { settingsSchema } from "@/lib/validations/settings";
import * as v from "valibot";
import { revalidatePath } from "next/cache";
import { exchangeRates, settings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";

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

    // Sync currentRateId with the selected currency's latest rate
    if (updatePayload.rateCurrency) {
      const [latestRate] = await db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.currency, updatePayload.rateCurrency))
        .orderBy(desc(exchangeRates.fetchedAt))
        .limit(1);

      if (latestRate) {
        updatePayload.currentRateId = latestRate.id;
      }
    }

    await updateSettingsDb(updatePayload);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Save settings error:", error);
    return { success: false, error: "Error al guardar configuración" };
  }
}

export async function toggleGlobalAdicionales(enabled: boolean) {
  await requireAdmin();
  try {
    await updateSettingsDb({ adicionalesEnabled: enabled });
    revalidatePath("/");
    revalidatePath("/admin/catalogo");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar la configuración" };
  }
}

export async function toggleGlobalBebidas(enabled: boolean) {
  await requireAdmin();
  try {
    await updateSettingsDb({ bebidasEnabled: enabled });
    revalidatePath("/");
    revalidatePath("/admin/catalogo");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar la configuración" };
  }
}

export async function fetchActiveRate() {
  return getActiveRate();
}

export async function fetchCheckoutSettings() {
  const [rateResult, s] = await Promise.all([
    getActiveRate(),
    getSettings()
  ]);

  return {
    rate: rateResult?.rate ?? null,
    orderModeOnSiteEnabled: s?.orderModeOnSiteEnabled ?? true,
    orderModeTakeAwayEnabled: s?.orderModeTakeAwayEnabled ?? true,
    orderModeDeliveryEnabled: s?.orderModeDeliveryEnabled ?? true,
    packagingFeePerPlateUsdCents: s?.packagingFeePerPlateUsdCents ?? 0,
    packagingFeePerAdicionalUsdCents: s?.packagingFeePerAdicionalUsdCents ?? 0,
    packagingFeePerBebidaUsdCents: s?.packagingFeePerBebidaUsdCents ?? 0,
    deliveryFeeUsdCents: s?.deliveryFeeUsdCents ?? 0,
    deliveryCoverage: s?.deliveryCoverage ?? null,
    transferBankName: s?.transferBankName ?? "",
    transferAccountName: s?.transferAccountName ?? "",
    transferAccountNumber: s?.transferAccountNumber ?? "",
    transferAccountRif: s?.transferAccountRif ?? "",
    paymentPagoMovilEnabled: s?.paymentPagoMovilEnabled ?? true,
    paymentTransferEnabled: s?.paymentTransferEnabled ?? true,
    restaurantName: s?.restaurantName ?? "G&M",
  };
}
