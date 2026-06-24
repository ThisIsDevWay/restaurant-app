import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  numeric,
  serial,
  index,
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
      // Categoría del ítem — habilita el ruteo de impresión por estación
      // (p.ej. la barra imprime Postres/Café/Bebidas). Opcional para pedidos
      // viejos creados antes de añadir estos campos.
      categoryId?: string | null;
      categoryName?: string | null;
      priceUsdCents: number;
      priceBsCents: number;
      isPrepackaged?: boolean;
      costUsdCents?: number | null;
      includedNote?: string | null;
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
      | "whatsapp"
      | "Efectivo $"
      | "Efectivo Bs"
      | "Pago Móvil"
      | "Punto / PdV"
      | "Zelle"
      | "Transf."
      | "Binance"
    >(),
  paymentProvider: text("payment_provider")
    .notNull()
    .$type<
      | "banesco_reference"
      | "mercantil_c2p"
      | "bnc_feed"
      | "whatsapp_manual"
      | "pabilo_bdv"
      | "pabilo_notifications"
      | "local_notifications"
    >(),
  paymentReference: text("payment_reference"),
  paymentLogId: uuid("payment_log_id").references((): any => paymentsLog.id),
  orderMode: text("order_mode")
    .$type<"on_site" | "take_away" | "delivery">(),
  deliveryAddress: text("delivery_address"),
  tableNumber: text("table_number"),
  customerName: text("customer_name"),
  createdByRole: text("created_by_role").$type<"admin" | "waiter" | "cashier">(),
  // Surcharges — packaging + delivery fees calculados al momento del checkout
  packagingUsdCents: integer("packaging_usd_cents").notNull().default(0),
  deliveryUsdCents: integer("delivery_usd_cents").notNull().default(0),
  igtfUsdCents: integer("igtf_usd_cents").notNull().default(0),
  igtfBsCents: integer("igtf_bs_cents").notNull().default(0),
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
    deliveryZoneLabel?: string;
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
  paidAt: timestamp("paid_at", { withTimezone: true }),
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
}, (table) => ({
  statusIdx: index("orders_status_idx").on(table.status),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  orderNumberIdx: index("orders_order_number_idx").on(table.orderNumber),
  customerPhoneIdx: index("orders_customer_phone_idx").on(table.customerPhone),
  // Composite indexes for common query patterns
  phoneCreatedIdx: index("orders_phone_created_idx").on(table.customerPhone, table.createdAt),
  statusCreatedIdx: index("orders_status_created_idx").on(table.status, table.createdAt),
  providerCreatedIdx: index("orders_provider_created_idx").on(table.paymentProvider, table.createdAt),
}));
