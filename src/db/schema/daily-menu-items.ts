import {
  pgTable,
  uuid,
  integer,
  date,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const dailyMenuItems = pgTable(
  "daily_menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isAvailable: boolean("is_available").notNull().default(true),
    soldOutAt: timestamp("sold_out_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.menuItemId, t.date)],
);
