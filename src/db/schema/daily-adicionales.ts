import {
  pgTable,
  uuid,
  date,
  integer,
  timestamp,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const dailyAdicionales = pgTable(
  "daily_adicionales",
  {
    date: date("date").notNull(),
    adicionalItemId: uuid("adicional_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isAvailable: boolean("is_available").notNull().default(true),
    soldOutAt: timestamp("sold_out_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.adicionalItemId] }),
  }),
);
