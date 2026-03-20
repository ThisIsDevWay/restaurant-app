import { pgTable, uuid, numeric, date, timestamp, text } from "drizzle-orm/pg-core";

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  rateBsPerUsd: numeric("rate_bs_per_usd", { precision: 18, scale: 8 }).notNull(),
  validDate: date("valid_date").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  source: text("source").notNull().default("bcv_official"),
});
