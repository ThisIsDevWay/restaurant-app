import * as v from "valibot";

// HH:MM (24h) or empty string (schedule not yet fully configured).
const hhmm = v.union([
  v.literal(""),
  v.pipe(v.string(), v.regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)")),
]);

export const settingsSchema = v.object({
  bankName: v.pipe(v.string(), v.minLength(1)),
  bankCode: v.pipe(v.string(), v.minLength(1)),
  restaurantName: v.pipe(v.string(), v.minLength(1)),
  accountPhone: v.pipe(v.string(), v.minLength(1)),
  accountRif: v.pipe(v.string(), v.minLength(1)),
  transferBankName: v.string(),
  transferAccountName: v.string(),
  transferAccountNumber: v.string(),
  transferAccountRif: v.string(),
  orderExpirationMinutes: v.pipe(v.number(), v.integer(), v.minValue(5)),
  maxPendingOrders: v.pipe(v.number(), v.integer(), v.minValue(1)),
  maxQuantityPerItem: v.pipe(v.number(), v.integer(), v.minValue(1)),
  rateCurrency: v.picklist(["usd", "eur"]),
  showRateInMenu: v.boolean(),
  rateOverrideBsPerUsd: v.optional(v.string()),
  activePaymentProvider: v.picklist([
    "banesco_reference",
    "mercantil_c2p",
    "bnc_feed",
    "whatsapp_manual",
    "pabilo_bdv",
    "pabilo_notifications",
  ]),
  banescoApiKey: v.optional(v.string()),
  mercantilClientId: v.optional(v.string()),
  mercantilClientSecret: v.optional(v.string()),
  mercantilSecretKey: v.optional(v.string()),
  mercantilMerchantId: v.optional(v.string()),
  mercantilIntegratorId: v.optional(v.string()),
  mercantilTerminalId: v.optional(v.string()),
  bncApiKey: v.optional(v.string()),
  pabiloApiKey: v.optional(v.string()),
  pabiloUserBankId: v.optional(v.string()),
  pabiloNotificationsBankId: v.optional(v.string()),
  whatsappNumber: v.optional(v.string()),
  whatsappMicroserviceUrl: v.optional(v.string()),
  adicionalesEnabled: v.optional(v.boolean()),
  bebidasEnabled: v.optional(v.boolean()),
  instagramUrl: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  logoImagekitFileId: v.optional(v.nullable(v.string())),
  coverImageUrl: v.optional(v.string()),
  coverImagekitFileId: v.optional(v.nullable(v.string())),
  branchName: v.optional(v.string()),
  scheduleText: v.optional(v.string()),
  businessHours: v.optional(
    v.union([
      v.object({
        days: v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6))),
        open: hhmm,
        close: hhmm,
      }),
      v.record(
        v.pipe(v.string(), v.regex(/^[0-6]$/)),
        v.object({
          isOpen: v.boolean(),
          intervals: v.array(
            v.object({
              open: hhmm,
              close: hhmm,
            })
          ),
        })
      ),
    ])
  ),
  statusOverride: v.optional(v.picklist(["auto", "open", "closed"])),
  hideMenuWhenClosed: v.optional(v.boolean()),
  preOpenVisibilityMinutes: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  orderModeOnSiteEnabled: v.optional(v.boolean()),
  orderModeTakeAwayEnabled: v.optional(v.boolean()),
  orderModeDeliveryEnabled: v.optional(v.boolean()),
  packagingFeePerPlateUsdCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  packagingFeePerAdicionalUsdCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  packagingFeePerBebidaUsdCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  deliveryFeeUsdCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  deliveryCoverage: v.optional(v.string()),
  deliveryZones: v.optional(
    v.array(
      v.object({
        label: v.pipe(v.string(), v.minLength(1)),
        feeUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
      }),
    ),
  ),
  requirePaymentBeforeKitchen: v.optional(v.boolean()),
  paymentPagoMovilEnabled: v.optional(v.boolean()),
  paymentTransferEnabled: v.optional(v.boolean()),
  paymentEfectivoEnabled: v.optional(v.boolean()),
  paymentZelleEnabled: v.optional(v.boolean()),
  zelleEmail: v.optional(v.string()),
  zelleName: v.optional(v.string()),
  paymentBinanceEnabled: v.optional(v.boolean()),
  binanceEmail: v.optional(v.string()),
  binancePayId: v.optional(v.string()),
  efectivoAskCashAmount: v.optional(v.boolean()),
  efectivoAskChangeBs: v.optional(v.boolean()),
  menuLayout: v.optional(v.picklist(["modern", "classic"])),
  menuItemSortMode: v.optional(v.picklist(["custom", "price_asc", "price_desc"])),
  tablesDefaultZoom: v.optional(v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(200))),
  applyIgtf: v.optional(v.boolean()),
  igtfPercentage: v.optional(v.string()),
  printerTargets: v.optional(
    v.array(
      v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        station: v.optional(v.picklist(["kitchen", "cashier", "bar", "other"]), "cashier"),
        items: v.optional(
          v.object({
            mode: v.optional(v.picklist(["all", "drinks", "categories"]), "all"),
            categoryIds: v.optional(v.array(v.string()), []),
            includeDrinks: v.optional(v.boolean()),
          }),
          { mode: "all", categoryIds: [] },
        ),
        sections: v.optional(
          v.object({
            header: v.optional(v.boolean(), true),
            orderMeta: v.optional(v.boolean(), true),
            location: v.optional(v.boolean(), true),
            contactData: v.optional(v.boolean(), false),
            totals: v.optional(v.boolean(), false),
            surcharges: v.optional(v.boolean(), false),
          }),
          { header: true, orderMeta: true, location: true, contactData: false, totals: false, surcharges: false },
        ),
        copies: v.pipe(v.number(), v.integer(), v.minValue(1)),
        reprintCopies: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
        enabled: v.boolean(),
      })
    )
  ),
});

export type SettingsInput = v.InferOutput<typeof settingsSchema>;
