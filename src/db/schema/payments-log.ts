import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const paymentsLog = pgTable("payments_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  providerId: text("provider_id").notNull(),
  amountBsCents: integer("amount_bs_cents").notNull(),
  reference: text("reference").unique(),
  senderPhone: text("sender_phone"),
  providerRaw: jsonb("provider_raw").notNull(),
  outcome: text("outcome")
    .notNull()
    .$type<"confirmed" | "rejected" | "manual">(),
  confirmedBy: uuid("confirmed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
