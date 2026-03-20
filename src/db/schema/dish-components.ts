import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const dishComponents = pgTable("dish_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"contorno" | "fixed">(),
  removable: boolean("removable").notNull().default(false),
  priceIfRemovedCents: integer("price_if_removed_cents"),
  // Negative = discount. Stored in cents (USD) to match priceUsdCents pattern.
  // null = price doesn't change when removed.
  allowPaidSubstitution: boolean("allow_paid_substitution")
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
