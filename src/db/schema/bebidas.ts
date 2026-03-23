import {
    pgTable,
    uuid,
    primaryKey,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu";

export const menuItemBebidas = pgTable(
    "menu_item_bebidas",
    {
        menuItemId: uuid("menu_item_id")
            .notNull()
            .references(() => menuItems.id, { onDelete: "cascade" }),
        bebidaItemId: uuid("bebida_item_id")
            .notNull()
            .references(() => menuItems.id, { onDelete: "cascade" }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.menuItemId, t.bebidaItemId] }),
    }),
);
