import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  numeric,
  serial,
} from "drizzle-orm/pg-core";
import { exchangeRates } from "./exchangeRates";
import { paymentsLog } from "./payments-log";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: serial("order_number").notNull(),
  customerPhone: text("customer_phone").notNull(),
  itemsSnapshot: jsonb("items_snapshot").notNull().$type<
    Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      priceBsCents: number;
      fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
      selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        substitutesComponentId?: string;
        substitutesComponentName?: string;
        quantity?: number;
      }>;
      selectedBebidas?: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        quantity?: number;
      }>;
      removedComponents: Array<{
        isRemoval: true;
        componentId: string;
        name: string;
        priceUsdCents: number;
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
      | "cancelled"
    >()
    .default("pending"),
  paymentMethod: text("payment_method")
    .notNull()
    .$type<
      | "pago_movil"
      | "transfer"
      | "whatsapp"
      | "cash"
      | "cash_usd"
      | "cash_bs"
      | "pos"
      | "zelle"
      | "binance"
    >(),
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
  orderMode: text("order_mode")
    .$type<"on_site" | "take_away" | "delivery">(),
  deliveryAddress: text("delivery_address"),
  tableNumber: text("table_number"),
  customerName: text("customer_name"),
  // Surcharges — packaging + delivery fees calculados al momento del checkout
  packagingUsdCents: integer("packaging_usd_cents").notNull().default(0),
  deliveryUsdCents: integer("delivery_usd_cents").notNull().default(0),
  grandTotalUsdCents: integer("grand_total_usd_cents").notNull().default(0),
  grandTotalBsCents: integer("grand_total_bs_cents").notNull().default(0),
  surchargesSnapshot: jsonb("surcharges_snapshot").$type<{
    plateCount: number;
    adicionalCount: number;
    bebidaCount: number;
    packagingFeePerPlateUsdCents: number;
    packagingFeePerAdicionalUsdCents: number;
    packagingFeePerBebidaUsdCents: number;
    packagingUsdCents: number;
    deliveryFeeUsdCents: number;
    deliveryUsdCents: number;
    orderMode: string;
  }>(),
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
  gpsCoords: jsonb("gps_coords").$type<{ lat: number; lng: number; accuracy: number } | null>(),
  checkoutToken: text("checkout_token").unique(),
  paymentMetadata: jsonb("payment_metadata").$type<{
    uploadedUrl?: string;
    [key: string]: any;
  }>(),
});
