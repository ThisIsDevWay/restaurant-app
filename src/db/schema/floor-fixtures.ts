import {
  pgTable, uuid, text, integer, timestamp,
} from "drizzle-orm/pg-core";

export type FixtureType =
  | "wall_h"       // pared horizontal — span ancho, rowSpan=1
  | "wall_v"       // pared vertical   — colSpan=1, span alto
  | "door"         // puerta sencilla
  | "door_double"  // puerta doble
  | "window"       // ventana
  | "bar_counter"  // mostrador de barra
  | "kitchen_pass" // ventana de paso a cocina
  | "cashier"      // caja/POS
  | "column"       // columna estructural
  | "stairs"       // escaleras
  | "bathroom"     // baño genérico
  | "bathroom_m"   // baño masculino
  | "bathroom_f"   // baño femenino
  | "plant"        // planta decorativa
  | "divider"      // separador/biombo
  | "text_label";  // etiqueta de texto libre (zona, salida, etc.)

export const floorFixtures = pgTable("floor_fixtures", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().$type<FixtureType>(),
  label: text("label"),          // texto personalizable, opcional salvo text_label
  gridCol: integer("grid_col").notNull(),
  gridRow: integer("grid_row").notNull(),
  colSpan: integer("col_span").notNull().default(1),
  rowSpan: integer("row_span").notNull().default(1),
  rotation: integer("rotation").notNull().default(0), // 0 | 90 | 180 | 270 grados
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
});

export type FloorFixture = typeof floorFixtures.$inferSelect;
export type NewFloorFixture = typeof floorFixtures.$inferInsert;
