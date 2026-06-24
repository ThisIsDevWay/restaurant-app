import { pgTable, uuid, integer, text, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const bankNotifications = pgTable("bank_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull().$type<"pabilo" | "local_sms" | "local_app">(),
  sender: text("sender").notNull(), // ej: "278" (BDV) o "com.mercantil.movil"
  message: text("message").notNull(), // Texto completo de la alerta bancaria
  amountRaw: text("amount_raw"), // Guarda el texto crudo del monto (ej: "1.500,00")
  amountBsCents: integer("amount_bs_cents").notNull(), 
  reference: text("reference").notNull(), 
  senderPhone: text("sender_phone"),
  senderDocument: text("sender_document"),
  status: text("status").notNull().$type<"pending" | "reconciled" | "failed">().default("pending"),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  rawPayload: jsonb("raw_payload").notNull(), // Payload JSON completo recibido
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueReference: unique("bank_notifications_reference_unique").on(table.reference),
  referenceIdx: index("bank_notifications_reference_idx").on(table.reference),
  statusIdx: index("bank_notifications_status_idx").on(table.status),
  amountStatusIdx: index("bank_notifications_amount_status_idx").on(table.amountBsCents, table.status),
}));

export type BankNotification = typeof bankNotifications.$inferSelect;
export type NewBankNotification = typeof bankNotifications.$inferInsert;
