import {
  pgTable,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const menuItemAdicionales = pgTable(
  "menu_item_adicionales",
  {
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    adicionalItemId: uuid("adicional_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuItemId, t.adicionalItemId] }),
  }),
);
