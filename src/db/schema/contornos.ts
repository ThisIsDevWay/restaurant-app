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

export const menuItemContornos = pgTable(
  "menu_item_contornos",
  {
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    contornoItemId: uuid("contorno_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    removable: boolean("removable").notNull().default(false),
    substituteContornoIds: uuid("substitute_contorno_ids").array().notNull().default([]),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.contornoItemId] }),
  }),
);
