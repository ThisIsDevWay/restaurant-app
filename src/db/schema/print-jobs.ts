import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const printJobs = pgTable("print_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  copies: integer("copies").notNull().default(2),
  rawContent: text("raw_content").notNull(),
  status: text("status")
    .notNull()
    .$type<"pending" | "printing" | "printed" | "failed">()
    .default("pending"),
  target: text("target").notNull().default("main"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  printedAt: timestamp("printed_at", { withTimezone: true }),
});
