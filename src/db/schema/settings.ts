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
  accountPhone: text("account_phone").notNull(),
  accountRif: text("account_rif").notNull(),
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
  bncApiKey: text("bnc_api_key"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
