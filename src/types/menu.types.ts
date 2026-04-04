/**
 * Tipos canónicos para el sistema de menú.
 * Fuente única de verdad — no redefinir en componentes.
 */

// ============================================================================
// Tipos base de Drizzle (no modificar, solo re-exportar con nombre claro)
// ============================================================================

import type { menuItems, categories, optionGroups, options } from "@/db/schema";

export type DbMenuItem = typeof menuItems.$inferSelect;
export type NewDbMenuItem = typeof menuItems.$inferInsert;
export type DbCategory = typeof categories.$inferSelect;
export type NewDbCategory = typeof categories.$inferInsert;

// ============================================================================
// Subtipos reutilizables
// ============================================================================

export interface OptionItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface OptionGroupWithOptions {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  sortOrder: number;
  options: OptionItem[];
}

export interface SimpleComponent {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ContornoComponent extends SimpleComponent {
  removable: boolean;
  substituteContornoIds: string[];
}

// ============================================================================
// Tipo enriquecido para el menú público (resultado de la query JOIN)
// ============================================================================

export interface MenuItemWithComponents {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  categoryId: string;
  categoryName: string;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  sortOrder: number;
  optionGroups: OptionGroupWithOptions[];
  adicionales: SimpleComponent[];
  bebidas: SimpleComponent[];
  contornos: ContornoComponent[];
}

// ============================================================================
// Re-export para compatibilidad con componentes existentes
// ============================================================================

/** @deprecated Usa MenuItemWithComponents directamente. Este alias se eliminará en una versión futura. */
export type MenuItem = MenuItemWithComponents;
