import {
  pgTable,
  integer,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { exchangeRates } from "./exchangeRates";

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code").notNull(),
  restaurantName: text("restaurant_name").notNull().default("G&M"),
  accountPhone: text("account_phone").notNull(),
  accountRif: text("account_rif").notNull(),
  transferBankName: text("transfer_bank_name").notNull().default(""),
  transferAccountName: text("transfer_account_name").notNull().default(""),
  transferAccountNumber: text("transfer_account_number").notNull().default(""),
  transferAccountRif: text("transfer_account_rif").notNull().default(""),
  orderExpirationMinutes: integer("order_expiration_minutes")
    .notNull()
    .default(30),
  maxPendingOrders: integer("max_pending_orders").notNull().default(99),
  currentRateId: uuid("current_rate_id").references(() => exchangeRates.id),
  rateOverrideBsPerUsd: numeric("rate_override_bs_per_usd", {
    precision: 18,
    scale: 8,
  }),
  rateCurrency: text("rate_currency").notNull().default("usd"),
  showRateInMenu: boolean("show_rate_in_menu").notNull().default(true),
  activePaymentProvider: text("active_payment_provider")
    .notNull()
    .default("banesco_reference"),
  banescoApiKey: text("banesco_api_key"),
  mercantilClientId: text("mercantil_client_id"),
  mercantilClientSecret: text("mercantil_client_secret"),
  mercantilSecretKey: text("mercantil_secret_key"),
  mercantilMerchantId: text("mercantil_merchant_id"),
  mercantilIntegratorId: text("mercantil_integrator_id"),
  mercantilTerminalId: text("mercantil_terminal_id"),
  bncApiKey: text("bnc_api_key"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  whatsappMicroserviceUrl: text("whatsapp_microservice_url")
    .notNull()
    .default(""),
  adicionalesEnabled: boolean("adicionales_enabled").notNull().default(true),
  bebidasEnabled: boolean("bebidas_enabled").notNull().default(true),
  maxQuantityPerItem: integer("max_quantity_per_item").notNull().default(10),
  instagramUrl: text("instagram_url"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  branchName: text("branch_name"),
  scheduleText: text("schedule_text"),
  orderModeOnSiteEnabled: boolean("order_mode_on_site_enabled").notNull().default(true),
  orderModeTakeAwayEnabled: boolean("order_mode_take_away_enabled").notNull().default(true),
  orderModeDeliveryEnabled: boolean("order_mode_delivery_enabled").notNull().default(true),
  packagingFeePerPlateUsdCents: integer("packaging_fee_per_plate_usd_cents").notNull().default(0),
  packagingFeePerAdicionalUsdCents: integer("packaging_fee_per_adicional_usd_cents").notNull().default(0),
  packagingFeePerBebidaUsdCents: integer("packaging_fee_per_bebida_usd_cents").notNull().default(0),
  deliveryFeeUsdCents: integer("delivery_fee_usd_cents").notNull().default(0),
  deliveryCoverage: text("delivery_coverage"),
  paymentPagoMovilEnabled: boolean("payment_pago_movil_enabled").notNull().default(true),
  paymentTransferEnabled: boolean("payment_transfer_enabled").notNull().default(true),
  menuLayout: text("menu_layout").notNull().default("modern"),
  menuItemSortMode: text("menu_item_sort_mode").notNull().default("custom"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
