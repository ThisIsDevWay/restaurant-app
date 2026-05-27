"use server";

import { requireAdmin } from "@/lib/auth";
import { updateSettings as updateSettingsDb, getActiveRate, getSettings, getLatestRateByCurrency, invalidateSettingsCache } from "@/db/queries/settings";
import { settingsSchema } from "@/lib/validations/settings";
import * as v from "valibot";
import { revalidatePath } from "next/cache";
import { exchangeRates, settings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { adminActionClient } from "@/lib/safe-action";
import { deleteFile } from "@/lib/imagekit/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

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
        const latestRate = await getLatestRateByCurrency(updatePayload.rateCurrency);
        if (latestRate) {
          updatePayload.currentRateId = latestRate.id;
        }
      }

      // Delete orphaned ImageKit files when logo or hero image changes
      const current = await getSettings();
      if (current) {
        if (
          current.logoImagekitFileId &&
          current.logoImagekitFileId !== parsedInput.logoImagekitFileId
        ) {
          await deleteFile(current.logoImagekitFileId);
        }
        if (
          current.coverImagekitFileId &&
          current.coverImagekitFileId !== parsedInput.coverImagekitFileId
        ) {
          await deleteFile(current.coverImagekitFileId);
        }
      }

      await updateSettingsDb(updatePayload);
      invalidateSettingsCache();
      revalidatePath("/admin/settings");
      revalidatePath("/admin/tables");
      return { success: true } as ActionResult;
    } catch (error) {
      logger.error("Save settings error", { error });
      Sentry.captureException(error);
      return { success: false, error: "Error al guardar configuración" };
    }
  });

export const updateTablesZoomAction = adminActionClient
  .schema(v.object({ zoom: v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(200)) }))
  .action(async ({ parsedInput: { zoom } }) => {
    try {
      await updateSettingsDb({ tablesDefaultZoom: zoom });
      revalidatePath("/admin/tables");
      return { success: true };
    } catch (error) {
      logger.error("Update zoom error", { error });
      return { success: false, error: "Error al guardar zoom" };
    }
  });



export const toggleGlobalAdicionalesAction = adminActionClient
  .schema(v.object({ enabled: v.boolean() }))
  .action(async ({ parsedInput: { enabled } }) => {
    await updateSettingsDb({ adicionalesEnabled: enabled });
    invalidateSettingsCache();
    revalidatePath("/admin/catalogo");
    return { success: true };
  });



export const toggleGlobalBebidasAction = adminActionClient
  .schema(v.object({ enabled: v.boolean() }))
  .action(async ({ parsedInput: { enabled } }) => {
    await updateSettingsDb({ bebidasEnabled: enabled });
    invalidateSettingsCache();
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
    whatsappNumber: s?.whatsappNumber ?? "",
    bankName: s?.bankName ?? "",
    bankCode: s?.bankCode ?? "",
    accountPhone: s?.accountPhone ?? "",
    accountRif: s?.accountRif ?? "",
    activePaymentProvider: s?.activePaymentProvider ?? "whatsapp_manual",
    orderExpirationMinutes: s?.orderExpirationMinutes ?? 30,
  };
}


