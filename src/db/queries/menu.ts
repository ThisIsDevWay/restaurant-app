import { db } from "../index";
import { menuItems, optionGroups, options, categories, menuItemAdicionales, menuItemContornos, menuItemBebidas } from "../schema";
import { eq, sql, and, asc } from "drizzle-orm";
import { getSettings } from "./settings";
import { buildMenuItemSortColumns, type MenuItemSortMode } from "./sort-utils";
import { unstable_cache, revalidateTag } from "next/cache";
import type {
  MenuItemWithComponents,
  OptionGroupWithOptions,
  OptionItem,
  SimpleComponent,
  ContornoComponent,
} from "@/types/menu.types";
import { inArray } from "drizzle-orm";

export interface MenuWithGroups {
  id: string;
  name: string;
  description: string | null;
  includedNote?: string | null;
  portionNote?: string | null;
  hideAdicionales?: boolean;
  hideBebidas?: boolean;
  priceUsdCents: number;
  costUsdCents: number | null;
  costUpdatedAt: Date | null;
  categoryId: string;
  categoryName: string;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  imagekitFileId: string | null;
  sortOrder: number;
  optionGroups: OptionGroupWithOptions[];
}

export type MenuWithComponents = MenuItemWithComponents;

export async function getMenuWithOptions(): Promise<MenuWithGroups[]> {
  const settings = await getSettings();
  const sortMode = (settings?.menuItemSortMode ?? "custom") as MenuItemSortMode;
  const itemsSortColumns = buildMenuItemSortColumns(sortMode);

  const [items, groupRows] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        includedNote: menuItems.includedNote,
        portionNote: menuItems.portionNote,
        hideAdicionales: menuItems.hideAdicionales,
        hideBebidas: menuItems.hideBebidas,
        priceUsdCents: menuItems.priceUsdCents,
        costUsdCents: menuItems.costUsdCents,
        costUpdatedAt: menuItems.costUpdatedAt,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        categoryAllowAlone: categories.allowAlone,
        categoryIsSimple: categories.isSimple,
        isAvailable: menuItems.isAvailable,
        imageUrl: menuItems.imageUrl,
        imagekitFileId: menuItems.imagekitFileId,
        sortOrder: menuItems.sortOrder,
        isPrepackaged: menuItems.isPrepackaged,
      })
      .from(menuItems)
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .orderBy(...itemsSortColumns),

    db
      .select({
        groupId: optionGroups.id,
        menuItemId: optionGroups.menuItemId,
        groupName: optionGroups.name,
        groupType: optionGroups.type,
        groupRequired: optionGroups.required,
        groupSortOrder: optionGroups.sortOrder,
        optionId: options.id,
        optionName: options.name,
        optionPriceUsdCents: options.priceUsdCents,
        optionIsAvailable: options.isAvailable,
        optionSortOrder: options.sortOrder,
      })
      .from(optionGroups)
      .innerJoin(options, eq(optionGroups.id, options.groupId))
      .orderBy(optionGroups.sortOrder, options.sortOrder),
  ]);

  const optionsByItem = new Map<
    string,
    OptionGroupWithOptions[]
  >();

  for (const row of groupRows) {
    let groups = optionsByItem.get(row.menuItemId);
    if (!groups) {
      groups = [];
      optionsByItem.set(row.menuItemId, groups);
    }

    let group = groups.find((g) => g.id === row.groupId);
    if (!group) {
      group = {
        id: row.groupId,
        name: row.groupName,
        type: row.groupType,
        required: row.groupRequired,
        sortOrder: row.groupSortOrder,
        options: [],
      };
      groups.push(group);
    }

    group.options.push({
      id: row.optionId,
      name: row.optionName,
      priceUsdCents: row.optionPriceUsdCents,
      isAvailable: row.optionIsAvailable,
      sortOrder: row.optionSortOrder,
    });
  }

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
  }));
}

export async function getMenuWithOptionsAndComponents(): Promise<MenuWithComponents[]> {
  const settings = await getSettings();
  const sortMode = (settings?.menuItemSortMode ?? "custom") as MenuItemSortMode;
  const itemsSortColumns = buildMenuItemSortColumns(sortMode);

  // Wave 1: base queries
  const [items, groupRows] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        includedNote: menuItems.includedNote,
        priceUsdCents: menuItems.priceUsdCents,
        costUsdCents: menuItems.costUsdCents,
        costUpdatedAt: menuItems.costUpdatedAt,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        categoryAllowAlone: categories.allowAlone,
        categoryIsSimple: categories.isSimple,
        isAvailable: menuItems.isAvailable,
        imageUrl: menuItems.imageUrl,
        sortOrder: menuItems.sortOrder,
        isPrepackaged: menuItems.isPrepackaged,
        defaultActive: menuItems.defaultActive,
      })
      .from(menuItems)
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(eq(categories.isAvailable, true))
      .orderBy(...itemsSortColumns),

    db
      .select({
        groupId: optionGroups.id,
        menuItemId: optionGroups.menuItemId,
        groupName: optionGroups.name,
        groupType: optionGroups.type,
        groupRequired: optionGroups.required,
        groupSortOrder: optionGroups.sortOrder,
        optionId: options.id,
        optionName: options.name,
        optionPriceUsdCents: options.priceUsdCents,
        optionIsAvailable: options.isAvailable,
        optionSortOrder: options.sortOrder,
      })
      .from(optionGroups)
      .innerJoin(options, eq(optionGroups.id, options.groupId))
      .orderBy(optionGroups.sortOrder, options.sortOrder),
  ]);

  // Short-circuit: if no items, avoids 3 unnecessary component queries
  if (items.length === 0) {
    return [];
  }

  // Wave 2: components in parallel
  const [adicionalRows, contornoRows, bebidaRows] = await Promise.all([
    // Fetch adicionales assignments
    db
      .select({
        menuItemId: menuItemAdicionales.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItemAdicionales)
      .innerJoin(menuItems, eq(menuItemAdicionales.adicionalItemId, menuItems.id))
      .orderBy(menuItems.sortOrder),

    // Fetch contornos assignments
    db
      .select({
        menuItemId: menuItemContornos.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
        removable: menuItemContornos.removable,
        substituteContornoIds: menuItemContornos.substituteContornoIds,
      })
      .from(menuItemContornos)
      .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
      .orderBy(menuItems.sortOrder),

    // Fetch bebidas assignments
    db
      .select({
        menuItemId: menuItemBebidas.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItemBebidas)
      .innerJoin(menuItems, eq(menuItemBebidas.bebidaItemId, menuItems.id))
      .orderBy(menuItems.sortOrder),
  ]);

  const optionsByItem = new Map<string, OptionGroupWithOptions[]>();

  for (const row of groupRows) {
    let groups = optionsByItem.get(row.menuItemId);
    if (!groups) {
      groups = [];
      optionsByItem.set(row.menuItemId, groups);
    }

    let group = groups.find((g) => g.id === row.groupId);
    if (!group) {
      group = {
        id: row.groupId,
        name: row.groupName,
        type: row.groupType,
        required: row.groupRequired,
        sortOrder: row.groupSortOrder,
        options: [],
      };
      groups.push(group);
    }

    group.options.push({
      id: row.optionId,
      name: row.optionName,
      priceUsdCents: row.optionPriceUsdCents,
      isAvailable: row.optionIsAvailable,
      sortOrder: row.optionSortOrder,
    });
  }

  const adicionalesByItem = new Map<string, SimpleComponent[]>();
  for (const row of adicionalRows) {
    let list = adicionalesByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      adicionalesByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      sortOrder: row.sortOrder,
    });
  }

  const contornosByItem = new Map<string, ContornoComponent[]>();
  for (const row of contornoRows) {
    let list = contornosByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      contornosByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      removable: row.removable,
      substituteContornoIds: row.substituteContornoIds,
      sortOrder: row.sortOrder,
    });
  }

  const bebidasByItem = new Map<string, SimpleComponent[]>();
  for (const row of bebidaRows) {
    let list = bebidasByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      bebidasByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      sortOrder: row.sortOrder,
    });
  }

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
    adicionales: adicionalesByItem.get(item.id) ?? [],
    contornos: contornosByItem.get(item.id) ?? [],
    bebidas: bebidasByItem.get(item.id) ?? [],
  }));
}

export async function getMenuItemsWithOptionsAndComponents(ids: string[]): Promise<MenuWithComponents[]> {
  if (ids.length === 0) return [];

  const settings = await getSettings();
  const sortMode = (settings?.menuItemSortMode ?? "custom") as MenuItemSortMode;
  const itemsSortColumns = buildMenuItemSortColumns(sortMode);

  // Wave 1: base queries
  const [items, groupRows] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        includedNote: menuItems.includedNote,
        priceUsdCents: menuItems.priceUsdCents,
        costUsdCents: menuItems.costUsdCents,
        costUpdatedAt: menuItems.costUpdatedAt,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        categoryAllowAlone: categories.allowAlone,
        categoryIsSimple: categories.isSimple,
        isAvailable: menuItems.isAvailable,
        imageUrl: menuItems.imageUrl,
        sortOrder: menuItems.sortOrder,
        isPrepackaged: menuItems.isPrepackaged,
        defaultActive: menuItems.defaultActive,
      })
      .from(menuItems)
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(inArray(menuItems.id, ids))
      .orderBy(...itemsSortColumns),

    db
      .select({
        groupId: optionGroups.id,
        menuItemId: optionGroups.menuItemId,
        groupName: optionGroups.name,
        groupType: optionGroups.type,
        groupRequired: optionGroups.required,
        groupSortOrder: optionGroups.sortOrder,
        optionId: options.id,
        optionName: options.name,
        optionPriceUsdCents: options.priceUsdCents,
        optionIsAvailable: options.isAvailable,
        optionSortOrder: options.sortOrder,
      })
      .from(optionGroups)
      .innerJoin(options, eq(optionGroups.id, options.groupId))
      .where(inArray(optionGroups.menuItemId, ids))
      .orderBy(optionGroups.sortOrder, options.sortOrder),
  ]);

  if (items.length === 0) return [];

  // Wave 2: components in parallel
  const [adicionalRows, contornoRows, bebidaRows] = await Promise.all([
    db
      .select({
        menuItemId: menuItemAdicionales.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItemAdicionales)
      .innerJoin(menuItems, eq(menuItemAdicionales.adicionalItemId, menuItems.id))
      .where(inArray(menuItemAdicionales.menuItemId, ids))
      .orderBy(menuItems.sortOrder),

    db
      .select({
        menuItemId: menuItemContornos.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
        removable: menuItemContornos.removable,
        substituteContornoIds: menuItemContornos.substituteContornoIds,
      })
      .from(menuItemContornos)
      .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
      .where(inArray(menuItemContornos.menuItemId, ids))
      .orderBy(menuItems.sortOrder),

    db
      .select({
        menuItemId: menuItemBebidas.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
        isPrepackaged: menuItems.isPrepackaged,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItemBebidas)
      .innerJoin(menuItems, eq(menuItemBebidas.bebidaItemId, menuItems.id))
      .where(inArray(menuItemBebidas.menuItemId, ids))
      .orderBy(menuItems.sortOrder),
  ]);

  const optionsByItem = new Map<string, OptionGroupWithOptions[]>();
  for (const row of groupRows) {
    let groups = optionsByItem.get(row.menuItemId);
    if (!groups) {
      groups = [];
      optionsByItem.set(row.menuItemId, groups);
    }
    let group = groups.find((g) => g.id === row.groupId);
    if (!group) {
      group = {
        id: row.groupId,
        name: row.groupName,
        type: row.groupType,
        required: row.groupRequired,
        sortOrder: row.groupSortOrder,
        options: [],
      };
      groups.push(group);
    }
    group.options.push({
      id: row.optionId,
      name: row.optionName,
      priceUsdCents: row.optionPriceUsdCents,
      isAvailable: row.optionIsAvailable,
      sortOrder: row.optionSortOrder,
    });
  }

  const adicionalesByItem = new Map<string, SimpleComponent[]>();
  for (const row of adicionalRows) {
    let list = adicionalesByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      adicionalesByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      sortOrder: row.sortOrder,
    });
  }

  const contornosByItem = new Map<string, ContornoComponent[]>();
  for (const row of contornoRows) {
    let list = contornosByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      contornosByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      removable: row.removable,
      substituteContornoIds: row.substituteContornoIds,
      sortOrder: row.sortOrder,
    });
  }

  const bebidasByItem = new Map<string, SimpleComponent[]>();
  for (const row of bebidaRows) {
    let list = bebidasByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      bebidasByItem.set(row.menuItemId, list);
    }
    list.push({
      id: row.id,
      name: row.name,
      priceUsdCents: row.priceUsdCents,
      isAvailable: row.isAvailable,
      isPrepackaged: row.isPrepackaged,
      sortOrder: row.sortOrder,
    });
  }

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
    adicionales: adicionalesByItem.get(item.id) ?? [],
    contornos: contornosByItem.get(item.id) ?? [],
    bebidas: bebidasByItem.get(item.id) ?? [],
  }));
}

export async function getAvailableMenuItems() {
  const settings = await getSettings();
  const sortMode = (settings?.menuItemSortMode ?? "custom") as MenuItemSortMode;
  const itemsSortColumns = buildMenuItemSortColumns(sortMode);

  return db
    .select()
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(eq(menuItems.isAvailable, true))
    .orderBy(...itemsSortColumns);
}

export async function getMenuItemById(id: string) {
  const [item] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  return item;
}

export async function getMenuItemWithOptions(id: string) {
  const [item] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);

  if (!item) return null;

  const groups = await db
    .select()
    .from(optionGroups)
    .where(eq(optionGroups.menuItemId, id))
    .orderBy(optionGroups.sortOrder);

  const groupsWithOptions = await Promise.all(
    groups.map(async (group) => {
      const opts = await db
        .select()
        .from(options)
        .where(eq(options.groupId, group.id))
        .orderBy(options.sortOrder);
      return { ...group, options: opts };
    }),
  );

  // Fetch contornos assigned to this menu item
  const itemContornos = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      isPrepackaged: menuItems.isPrepackaged,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
    .where(eq(menuItemContornos.menuItemId, id))
    .orderBy(menuItems.sortOrder);

  return { ...item, optionGroups: groupsWithOptions, contornos: itemContornos };
}

export async function getMenuItemWithOptionsAndComponents(id: string) {
  const [item] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);

  if (!item) return null;

  const groups = await db
    .select()
    .from(optionGroups)
    .where(eq(optionGroups.menuItemId, id))
    .orderBy(optionGroups.sortOrder);

  const groupsWithOptions = await Promise.all(
    groups.map(async (group) => {
      const opts = await db
        .select()
        .from(options)
        .where(eq(options.groupId, group.id))
        .orderBy(options.sortOrder);
      return { ...group, options: opts };
    }),
  );

  // Fetch adicionales assigned to this menu item
  const itemAdicionales = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      isPrepackaged: menuItems.isPrepackaged,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(menuItems, eq(menuItemAdicionales.adicionalItemId, menuItems.id))
    .where(eq(menuItemAdicionales.menuItemId, id))
    .orderBy(menuItems.sortOrder);

  // Fetch contornos assigned to this menu item
  const itemContornos = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      isPrepackaged: menuItems.isPrepackaged,
      sortOrder: menuItems.sortOrder,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
    .where(eq(menuItemContornos.menuItemId, id))
    .orderBy(menuItems.sortOrder);

  // Fetch bebidas assigned to this menu item
  const itemBebidas = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      isPrepackaged: menuItems.isPrepackaged,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItemBebidas)
    .innerJoin(menuItems, eq(menuItemBebidas.bebidaItemId, menuItems.id))
    .where(eq(menuItemBebidas.menuItemId, id))
    .orderBy(menuItems.sortOrder);

  return {
    ...item,
    optionGroups: groupsWithOptions,
    adicionales: itemAdicionales,
    contornos: itemContornos,
    bebidas: itemBebidas,
  };
}

async function getCategoriesRaw() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      sortOrder: categories.sortOrder,
      allowAlone: categories.allowAlone,
      isSimple: categories.isSimple,
      isAvailable: categories.isAvailable,
    })
    .from(categories)
    .orderBy(categories.sortOrder);
}

export const getCategories = (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "nodejs")
  ? unstable_cache(getCategoriesRaw, ["categories"], { tags: ["menu"], revalidate: 300 })
  : getCategoriesRaw;

export function invalidateMenuCache() {
  revalidateTag("menu");
}

export async function getCategoriesWithItemCount() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      sortOrder: categories.sortOrder,
      allowAlone: categories.allowAlone,
      isSimple: categories.isSimple,
      isAvailable: categories.isAvailable,
      itemCount: sql<number>`count(${menuItems.id})::int`,
    })
    .from(categories)
    .leftJoin(menuItems, eq(menuItems.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
}

