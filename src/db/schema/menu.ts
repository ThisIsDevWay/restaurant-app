import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { categories } from "./categories";

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    priceUsdCents: integer("price_usd_cents").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    isAvailable: boolean("is_available").notNull().default(true),
    isPrepackaged: boolean("is_prepackaged").notNull().default(false),
    imageUrl: text("image_url"),
    imagekitFileId: text("imagekit_file_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    costUsdCents: integer("cost_usd_cents"),
    costUpdatedAt: timestamp("cost_updated_at", { withTimezone: true }),
    portionNote: text("portion_note"),
    includedNote: text("included_note"),
    hideAdicionales: boolean("hide_adicionales").notNull().default(false),
    hideBebidas: boolean("hide_bebidas").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("menu_items_price_usd_cents_check", sql`${table.priceUsdCents} >= 0`),
  ],
);

export const optionGroups = pgTable(
  "option_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().$type<"radio" | "checkbox">(),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    migratedAt: timestamp("migrated_at", { withTimezone: true }),
  },
);

export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
