import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identidad visible
  label: text("label").notNull(), // "Mesa 1", "Barra 2", "Terraza A"
  section: text("section").default("Principal"), // zona/sección del salón
  capacity: integer("capacity").notNull().default(4),

  // Identificación QR
  qrToken: text("qr_token").notNull().unique(), // 8 chars alfanumérico, inmutable

  // Layout en el plano (coordenadas en grid de celdas de 40px)
  gridCol: integer("grid_col").notNull().default(1),
  gridRow: integer("grid_row").notNull().default(1),
  colSpan: integer("col_span").notNull().default(2), // ancho en celdas de grid
  rowSpan: integer("row_span").notNull().default(2), // alto en celdas de grid
  shape: text("shape").notNull().default("cuadrada").$type<"cuadrada" | "rectangular" | "circular">(),
  rotation: integer("rotation").notNull().default(0), // 0 | 90 | 180 | 270 degrees

  // Estado
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
});

export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;
