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

export const adicionales = pgTable("adicionales", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const menuItemAdicionales = pgTable(
  "menu_item_adicionales",
  {
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    adicionalId: uuid("adicional_id")
      .notNull()
      .references(() => adicionales.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.adicionalId] }),
  }),
);
