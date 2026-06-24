import {
  pgTable,
  integer,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { exchangeRates } from "./exchangeRates";
import type { PrinterTarget } from "@/lib/print/printer-target";

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
  pabiloApiKey: text("pabilo_api_key"),
  pabiloUserBankId: text("pabilo_user_bank_id"),
  pabiloNotificationsBankId: text("pabilo_notifications_bank_id"),
  localDeviceToken: text("local_device_token"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  whatsappMicroserviceUrl: text("whatsapp_microservice_url")
    .notNull()
    .default(""),
  adicionalesEnabled: boolean("adicionales_enabled").notNull().default(true),
  bebidasEnabled: boolean("bebidas_enabled").notNull().default(true),
  maxQuantityPerItem: integer("max_quantity_per_item").notNull().default(10),
  instagramUrl: text("instagram_url"),
  logoUrl: text("logo_url"),
  logoImagekitFileId: text("logo_imagekit_file_id"),
  coverImageUrl: text("cover_image_url"),
  coverImagekitFileId: text("cover_imagekit_file_id"),
  branchName: text("branch_name"),
  scheduleText: text("schedule_text"),
  businessHours: jsonb("business_hours").$type<{
    days: number[];
    open: string;
    close: string;
  } | null>(),
  // Manual open/closed override over the automatic schedule: auto | open | closed
  statusOverride: text("status_override").notNull().default("auto"),
  // When true, the public menu and checkout are hidden while the restaurant is closed
  hideMenuWhenClosed: boolean("hide_menu_when_closed").notNull().default(false),
  // How many minutes before opening the menu becomes visible (pre-open window)
  preOpenVisibilityMinutes: integer("pre_open_visibility_minutes").notNull().default(0),
  orderModeOnSiteEnabled: boolean("order_mode_on_site_enabled").notNull().default(true),
  orderModeTakeAwayEnabled: boolean("order_mode_take_away_enabled").notNull().default(true),
  orderModeDeliveryEnabled: boolean("order_mode_delivery_enabled").notNull().default(true),
  packagingFeePerPlateUsdCents: integer("packaging_fee_per_plate_usd_cents").notNull().default(0),
  packagingFeePerAdicionalUsdCents: integer("packaging_fee_per_adicional_usd_cents").notNull().default(0),
  packagingFeePerBebidaUsdCents: integer("packaging_fee_per_bebida_usd_cents").notNull().default(0),
  deliveryFeeUsdCents: integer("delivery_fee_usd_cents").notNull().default(0),
  deliveryCoverage: text("delivery_coverage"),
  deliveryZones: jsonb("delivery_zones")
    .notNull()
    .default([])
    .$type<Array<{ label: string; feeUsdCents: number }>>(),
  requirePaymentBeforeKitchen: boolean("require_payment_before_kitchen")
    .notNull()
    .default(false),
  paymentPagoMovilEnabled: boolean("payment_pago_movil_enabled").notNull().default(true),
  paymentTransferEnabled: boolean("payment_transfer_enabled").notNull().default(true),
  paymentEfectivoEnabled: boolean("payment_efectivo_enabled").notNull().default(false),
  paymentZelleEnabled: boolean("payment_zelle_enabled").notNull().default(false),
  zelleEmail: text("zelle_email"),
  zelleName: text("zelle_name"),
  paymentBinanceEnabled: boolean("payment_binance_enabled").notNull().default(false),
  binanceEmail: text("binance_email"),
  binancePayId: text("binance_pay_id"),
  efectivoAskCashAmount: boolean("efectivo_ask_cash_amount").notNull().default(true),
  efectivoAskChangeBs: boolean("efectivo_ask_change_bs").notNull().default(true),
  menuLayout: text("menu_layout").notNull().default("modern"),
  menuItemSortMode: text("menu_item_sort_mode").notNull().default("custom"),
  tablesGridCols: integer("tables_grid_cols").notNull().default(20),
  tablesGridRows: integer("tables_grid_rows").notNull().default(14),
  tablesDefaultZoom: integer("tables_default_zoom").notNull().default(90), // in percentage (e.g. 60 for 0.6)
  applyIgtf: boolean("apply_igtf").notNull().default(false),
  igtfPercentage: numeric("igtf_percentage", { precision: 5, scale: 2 }).notNull().default("3.00"),
  printerTargets: jsonb("printer_targets")
    .notNull()
    .default([{ name: "main", copies: 1, reprintCopies: 1, enabled: true }])
    // Las filas viejas pueden carecer de station/items/sections; se normalizan
    // en lectura con normalizePrinterTarget(). El tipo refleja el esquema nuevo.
    .$type<PrinterTarget[]>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
