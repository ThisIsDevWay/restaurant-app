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
import { PabiloClient, PabiloError } from "@pabilo/sdk";

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
    paymentEfectivoEnabled: s?.paymentEfectivoEnabled ?? false,
    efectivoAskCashAmount: s?.efectivoAskCashAmount ?? true,
    efectivoAskChangeBs: s?.efectivoAskChangeBs ?? true,
    paymentZelleEnabled: s?.paymentZelleEnabled ?? false,
    zelleEmail: s?.zelleEmail ?? "",
    zelleName: s?.zelleName ?? "",
    paymentBinanceEnabled: s?.paymentBinanceEnabled ?? false,
    binanceEmail: s?.binanceEmail ?? "",
    binancePayId: s?.binancePayId ?? "",
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

export const generateDeviceTokenAction = adminActionClient
  .schema(v.object({}))
  .action(async () => {
    try {
      const { randomBytes } = await import("crypto");
      const token = randomBytes(16).toString("hex");
      return { success: true, token };
    } catch (error) {
      logger.error("Generate token error", { error });
      return { success: false, error: "Error al generar token" };
    }
  });

const registerPabiloSchema = v.object({
  pabiloApiKey: v.pipe(v.string(), v.minLength(1, "API Key requerida")),
  username: v.pipe(v.string(), v.minLength(1, "Usuario requerido")),
  password: v.pipe(v.string(), v.minLength(1, "Contraseña requerida")),
  userBankPhone: v.pipe(v.string(), v.regex(/^04\d{9}$/, "Formato de teléfono inválido (Ej: 04121234567)")),
  userBankDni: v.pipe(v.string(), v.regex(/^\d+$/, "Cédula debe contener solo dígitos")),
  description: v.optional(v.string()),
});

export const registerPabiloBankAccount = adminActionClient
  .schema(registerPabiloSchema)
  .action(async ({ parsedInput: { pabiloApiKey, username, password, userBankPhone, userBankDni, description } }) => {
    try {
      const apiKey = pabiloApiKey.trim() || process.env.PABILO_API_KEY;
      if (!apiKey) {
        return { success: false, error: "La API Key de Pabilo no está configurada." };
      }

      const client = new PabiloClient({ apiKey });
      const bank = await client.bankAccounts.create({
        bankProvider: "VE_BAN",
        description: description || "Cuenta BDV Personal",
        userBankPhone,
        userBankDni,
        username,
        password,
      });

      return { success: true, userBankId: bank.id };
    } catch (err: any) {
      if (err instanceof PabiloError) {
        logger.error("registerPabiloBankAccount Pabilo SDK error", {
          code: err.code,
          status: err.statusCode,
          raw: err.raw,
        });
        Sentry.captureException(err, { extra: { context: "pabilo-register-bank" } });

        switch (err.code) {
          case "USER_BANCK_BAD_PASSWORD":
            return { success: false, error: "Las credenciales del portal BDV son incorrectas." };
          case "USER_BANCK_PASSWORD_EXPIRED":
            return { success: false, error: "La contraseña del portal BDV ha expirado. Actualízala en el portal de tu banco." };
          case "USER_BANK_ALREADY_EXISTS":
            return { success: false, error: "Esta cuenta BDV ya está registrada en Pabilo." };
          case "NOT_ENOUGH_CREDITS":
          case "PLAN_IS_NOT_ACTIVE":
          case "REQUEST_LIMIT_REACHED":
          case "BANK_ACCOUNT_LIMIT_REACHED":
            return { success: false, error: "Límite o créditos de tu plan Pabilo alcanzados." };
          case "UNAUTHORIZED":
            return { success: false, error: "Pabilo API Key inválida." };
          case "NETWORK_ERROR":
          case "INTERNAL_ERROR":
          default:
            return { success: false, error: "Error de conexión con Pabilo. Intenta de nuevo." };
        }
      } else {
        logger.error("Unhandled Pabilo bank account registration error", { error: err.message });
        Sentry.captureException(err, { extra: { context: "pabilo-register-bank-unhandled" } });
        return { success: false, error: "Error inesperado al registrar cuenta. Intenta de nuevo." };
      }
    }
  });



