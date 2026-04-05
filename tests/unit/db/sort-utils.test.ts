/**
 * Tests unitarios para sort-utils.ts
 *
 * Verifica que buildMenuItemSortColumns genere correctamente
 * las columnas de ordenamiento para cada modo soportado.
 *
 * Nota: Drizzle ORM no expone la representacion SQL cruda de forma publica.
 * Los tests verifican longitud, tipo y comportamiento, no el SQL interno.
 */
import { describe, it, expect } from "vitest";
import { buildMenuItemSortColumns } from "@/db/queries/sort-utils";
import type { MenuItemSortMode } from "@/db/queries/sort-utils";
import { SQL } from "drizzle-orm";

describe("buildMenuItemSortColumns", () => {
  describe("mode: custom", () => {
    it("returns 2 columns for custom sort mode", () => {
      const columns = buildMenuItemSortColumns("custom");
      expect(columns).toHaveLength(2);
    });

    it("returns SQL<unknown> instances", () => {
      const columns = buildMenuItemSortColumns("custom");
      expect(columns[0]).toBeInstanceOf(SQL);
      expect(columns[1]).toBeInstanceOf(SQL);
    });
  });

  describe("mode: price_asc", () => {
    it("returns 2 columns for price_asc sort mode", () => {
      const columns = buildMenuItemSortColumns("price_asc");
      expect(columns).toHaveLength(2);
    });

    it("returns SQL<unknown> instances", () => {
      const columns = buildMenuItemSortColumns("price_asc");
      expect(columns[0]).toBeInstanceOf(SQL);
      expect(columns[1]).toBeInstanceOf(SQL);
    });
  });

  describe("mode: price_desc", () => {
    it("returns 2 columns for price_desc sort mode", () => {
      const columns = buildMenuItemSortColumns("price_desc");
      expect(columns).toHaveLength(2);
    });

    it("returns SQL<unknown> instances", () => {
      const columns = buildMenuItemSortColumns("price_desc");
      expect(columns[0]).toBeInstanceOf(SQL);
      expect(columns[1]).toBeInstanceOf(SQL);
    });
  });

  describe("default parameter", () => {
    it("defaults to 'custom' when no argument is provided", () => {
      const columnsDefault = buildMenuItemSortColumns();
      const columnsCustom = buildMenuItemSortColumns("custom");
      expect(columnsDefault).toHaveLength(columnsCustom.length);
    });
  });

  describe("type safety", () => {
    it("accepts all valid MenuItemSortMode values", () => {
      const modes: MenuItemSortMode[] = ["custom", "price_asc", "price_desc"];
      for (const mode of modes) {
        const columns = buildMenuItemSortColumns(mode);
        expect(Array.isArray(columns)).toBe(true);
        expect(columns.length).toBeGreaterThanOrEqual(1);
        columns.forEach((col) => {
          expect(col).toBeInstanceOf(SQL);
        });
      }
    });
  });

  describe("consistency across modes", () => {
    it("always returns at least 1 column regardless of mode", () => {
      const modes: MenuItemSortMode[] = ["custom", "price_asc", "price_desc"];
      for (const mode of modes) {
        const columns = buildMenuItemSortColumns(mode);
        expect(columns.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("all columns are non-null SQL instances", () => {
      const modes: MenuItemSortMode[] = ["custom", "price_asc", "price_desc"];
      for (const mode of modes) {
        const columns = buildMenuItemSortColumns(mode);
        for (const col of columns) {
          expect(col).not.toBeNull();
          expect(col).not.toBeUndefined();
        }
      }
    });
  });
});
