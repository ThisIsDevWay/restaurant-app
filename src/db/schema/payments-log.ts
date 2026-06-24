import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const paymentsLog = pgTable("payments_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references((): any => orders.id, { onDelete: "set null" }),
  providerId: text("provider_id").notNull(),
  amountBsCents: integer("amount_bs_cents").notNull(),
  reference: text("reference"),
  senderPhone: text("sender_phone"),
  providerRaw: jsonb("provider_raw").notNull(),
  outcome: text("outcome")
    .notNull()
    .$type<"confirmed" | "rejected" | "manual">(),
  confirmedBy: uuid("confirmed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  uniqueReference: unique("payments_log_reference_unique")
    .on(table.reference)
    .nullsNotDistinct(),
  orderIdIdx: index("payments_log_order_id_idx").on(table.orderId),
  orderIdCreatedIdx: index("payments_log_order_id_created_idx").on(table.orderId, table.createdAt),
}));

