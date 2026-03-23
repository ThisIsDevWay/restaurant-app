import {
  pgTable,
  uuid,
  date,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const dailyBebidas = pgTable(
  "daily_bebidas",
  {
    date: date("date").notNull(),
    bebidaItemId: uuid("bebida_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.bebidaItemId] }),
  }),
);
