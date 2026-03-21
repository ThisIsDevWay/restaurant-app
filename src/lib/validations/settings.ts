import * as v from "valibot";

export const settingsSchema = v.object({
  bankName: v.pipe(v.string(), v.minLength(1)),
  bankCode: v.pipe(v.string(), v.minLength(1)),
  accountPhone: v.pipe(v.string(), v.minLength(1)),
  accountRif: v.pipe(v.string(), v.minLength(1)),
  orderExpirationMinutes: v.pipe(v.number(), v.integer(), v.minValue(5)),
  maxPendingOrders: v.pipe(v.number(), v.integer(), v.minValue(1)),
  rateCurrency: v.picklist(["usd", "eur"]),
  showRateInMenu: v.boolean(),
  rateOverrideBsPerUsd: v.optional(v.string()),
  activePaymentProvider: v.picklist([
    "banesco_reference",
    "mercantil_c2p",
    "bnc_feed",
    "whatsapp_manual",
  ]),
  banescoApiKey: v.optional(v.string()),
  whatsappNumber: v.optional(v.string()),
});

export type SettingsInput = v.InferOutput<typeof settingsSchema>;
