import {
  pgTable,
  uuid,
  date,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { adicionales } from "./adicionales";

export const dailyAdicionales = pgTable(
  "daily_adicionales",
  {
    date: date("date").notNull(),
    adicionalId: uuid("adicional_id")
      .notNull()
      .references(() => adicionales.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.adicionalId] }),
  }),
);
