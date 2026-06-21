import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const menuTemplates = pgTable("menu_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  data: jsonb("data").$type<{
    menuItemIds: string[];
    adicionalIds: string[];
    bebidaIds: string[];
    contornoIds: string[];
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
