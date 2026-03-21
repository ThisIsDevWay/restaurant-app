import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const contornos = pgTable("contornos", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const menuItemContornos = pgTable(
  "menu_item_contornos",
  {
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    contornoId: uuid("contorno_id")
      .notNull()
      .references(() => contornos.id, { onDelete: "cascade" }),
    removable: boolean("removable").notNull().default(false),
    substituteContornoIds: uuid("substitute_contorno_ids").array().notNull().default([]),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.contornoId] }),
  }),
);
