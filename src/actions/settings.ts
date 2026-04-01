"use server";

import { requireAdmin } from "@/lib/auth";
import { updateSettings as updateSettingsDb, getActiveRate, getSettings } from "@/db/queries/settings";
import { settingsSchema } from "@/lib/validations/settings";
import * as v from "valibot";
import { revalidatePath } from "next/cache";
import { exchangeRates, settings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { adminActionClient } from "@/lib/safe-action";

type ActionResult =
  | { success: true; error?: never }
  | { success: false; error: string };

export const saveSettingsAction = adminActionClient
  .schema(settingsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const updatePayload = { ...parsedInput } as any;

      if (updatePayload.rateOverrideBsPerUsd === undefined) {
        updatePayload.rateOverrideBsPerUsd = null;
      }

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
      return { success: true } as ActionResult;
    } catch (error) {
      console.error("Save settings error:", error);
      return { success: false, error: "Error al guardar configuración" };
    }
  });



export const toggleGlobalAdicionalesAction = adminActionClient
  .schema(v.object({ enabled: v.boolean() }))
  .action(async ({ parsedInput: { enabled } }) => {
    await updateSettingsDb({ adicionalesEnabled: enabled });
    revalidatePath("/");
    revalidatePath("/admin/catalogo");
    return { success: true };
  });



export const toggleGlobalBebidasAction = adminActionClient
  .schema(v.object({ enabled: v.boolean() }))
  .action(async ({ parsedInput: { enabled } }) => {
    await updateSettingsDb({ bebidasEnabled: enabled });
    revalidatePath("/");
    revalidatePath("/admin/catalogo");
    return { success: true };
  });



export const fetchActiveRate = async () => {
  return getActiveRate();
};

export const fetchCheckoutSettings = async () => {
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
