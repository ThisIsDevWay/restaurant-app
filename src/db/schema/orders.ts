import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { exchangeRates } from "./exchangeRates";
import { paymentsLog } from "./payments-log";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerPhone: text("customer_phone").notNull(),
  itemsSnapshot: jsonb("items_snapshot").notNull().$type<
    Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      priceBsCents: number;
      selectedContorno: { id: string; name: string } | null;
      selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
      }>;
      quantity: number;
      itemTotalBsCents: number;
    }>
  >(),
  subtotalUsdCents: integer("subtotal_usd_cents").notNull(),
  subtotalBsCents: integer("subtotal_bs_cents").notNull(),
  status: text("status")
    .notNull()
    .$type<
      | "pending"
      | "paid"
      | "kitchen"
      | "delivered"
      | "expired"
      | "failed"
      | "whatsapp"
    >()
    .default("pending"),
  paymentMethod: text("payment_method")
    .notNull()
    .$type<"pago_movil" | "transfer" | "whatsapp" | "cash" | "pos">(),
  paymentProvider: text("payment_provider")
    .notNull()
    .$type<
      | "banesco_reference"
      | "mercantil_c2p"
      | "bnc_feed"
      | "whatsapp_manual"
    >(),
  paymentReference: text("payment_reference"),
  paymentLogId: uuid("payment_log_id").references(() => paymentsLog.id),
  exchangeRateId: uuid("exchange_rate_id")
    .notNull()
    .references(() => exchangeRates.id),
  rateSnapshotBsPerUsd: numeric("rate_snapshot_bs_per_usd", {
    precision: 18,
    scale: 8,
  }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
