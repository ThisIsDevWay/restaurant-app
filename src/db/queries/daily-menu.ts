import { db } from "../index";
import {
  dailyMenuItems,
  menuItems,
  categories,
  optionGroups,
  options,
  adicionales,
  menuItemAdicionales,
  contornos,
  menuItemContornos,
  menuItemBebidas,
  dailyAdicionales,
  dailyBebidas,
} from "../schema";
import { eq, and, desc, inArray } from "drizzle-orm";

function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(date);
}

export async function getDailyMenuItemsForDate(dateStr: string) {
  return db
    .select({
      id: dailyMenuItems.id,
      menuItemId: dailyMenuItems.menuItemId,
      date: dailyMenuItems.date,
      sortOrder: dailyMenuItems.sortOrder,
      itemName: menuItems.name,
      itemDescription: menuItems.description,
      itemPriceUsdCents: menuItems.priceUsdCents,
      itemCategoryId: menuItems.categoryId,
      itemIsAvailable: menuItems.isAvailable,
      itemImageUrl: menuItems.imageUrl,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      categoryIsSimple: categories.isSimple,
    })
    .from(dailyMenuItems)
    .innerJoin(menuItems, eq(dailyMenuItems.menuItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(eq(dailyMenuItems.date, dateStr))
    .orderBy(categories.sortOrder, dailyMenuItems.sortOrder);
}

export async function getDailyMenuWithOptionsAndComponents(
  dateStr?: string,
) {
  const today = dateStr ?? formatLocalDate(new Date());

  const dailyItems = await getDailyMenuItemsForDate(today);

  if (dailyItems.length === 0) {
    return {
      items: [],
      dailyAdicionales: [],
      dailyBebidas: [],
    };
  }

  const menuItemIds = dailyItems.map((d) => d.menuItemId);

  // Fetch option groups for these items
  const groupRows = await db
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
    .where(inArray(optionGroups.menuItemId, menuItemIds))
    .orderBy(optionGroups.sortOrder, options.sortOrder);

  // Fetch adicionales for these items
  const adicionalRows = await db
    .select({
      menuItemId: menuItemAdicionales.menuItemId,
      id: adicionales.id,
      name: adicionales.name,
      priceUsdCents: adicionales.priceUsdCents,
      isAvailable: adicionales.isAvailable,
      sortOrder: adicionales.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(adicionales, eq(menuItemAdicionales.adicionalId, adicionales.id))
    .where(inArray(menuItemAdicionales.menuItemId, menuItemIds))
    .orderBy(adicionales.sortOrder);

  // Fetch contornos for these items
  const contornoRows = await db
    .select({
      menuItemId: menuItemContornos.menuItemId,
      id: contornos.id,
      name: contornos.name,
      priceUsdCents: contornos.priceUsdCents,
      isAvailable: contornos.isAvailable,
      sortOrder: contornos.sortOrder,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(contornos, eq(menuItemContornos.contornoId, contornos.id))
    .where(inArray(menuItemContornos.menuItemId, menuItemIds))
    .orderBy(contornos.sortOrder);

  // Fetch bebidas for these items
  const bebidaRows = await db
    .select({
      menuItemId: menuItemBebidas.menuItemId,
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItemBebidas)
    .innerJoin(menuItems, eq(menuItemBebidas.bebidaItemId, menuItems.id))
    .where(inArray(menuItemBebidas.menuItemId, menuItemIds))
    .orderBy(menuItems.sortOrder);

  // Fetch daily adicionales pool
  const dailyAdicionalRows = await db
    .select({
      id: adicionales.id,
      name: adicionales.name,
      priceUsdCents: adicionales.priceUsdCents,
      isAvailable: adicionales.isAvailable,
      sortOrder: dailyAdicionales.sortOrder,
    })
    .from(dailyAdicionales)
    .innerJoin(
      adicionales,
      eq(dailyAdicionales.adicionalId, adicionales.id),
    )
    .where(eq(dailyAdicionales.date, today))
    .orderBy(dailyAdicionales.sortOrder);

  // Fetch daily bebidas pool
  const dailyBebidaRows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: dailyBebidas.sortOrder,
    })
    .from(dailyBebidas)
    .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
    .where(eq(dailyBebidas.date, today))
    .orderBy(dailyBebidas.sortOrder);

  // Group by item
  const optionsByItem = new Map<
    string,
    Array<{
      id: string;
      menuItemId: string;
      name: string;
      type: "radio" | "checkbox";
      required: boolean;
      sortOrder: number;
      options: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        isAvailable: boolean;
        sortOrder: number;
      }>;
    }>
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
        menuItemId: row.menuItemId,
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

  const adicionalesByItem = new Map<string, typeof adicionalRows>();
  for (const row of adicionalRows) {
    let list = adicionalesByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      adicionalesByItem.set(row.menuItemId, list);
    }
    list.push(row);
  }

  const contornosByItem = new Map<string, typeof contornoRows>();
  for (const row of contornoRows) {
    let list = contornosByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      contornosByItem.set(row.menuItemId, list);
    }
    list.push(row);
  }

  const bebidasByItem = new Map<string, typeof bebidaRows>();
  for (const row of bebidaRows) {
    let list = bebidasByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      bebidasByItem.set(row.menuItemId, list);
    }
    list.push(row);
  }

  const items = dailyItems.map((d) => ({
    id: d.menuItemId,
    name: d.itemName,
    description: d.itemDescription,
    priceUsdCents: d.itemPriceUsdCents,
    categoryId: d.itemCategoryId,
    categoryName: d.categoryName,
    categoryAllowAlone: d.categoryAllowAlone,
    categoryIsSimple: d.categoryIsSimple,
    isAvailable: d.itemIsAvailable,
    imageUrl: d.itemImageUrl,
    sortOrder: d.sortOrder,
    optionGroups: optionsByItem.get(d.menuItemId) ?? [],
    adicionales: adicionalesByItem.get(d.menuItemId) ?? [],
    contornos: contornosByItem.get(d.menuItemId) ?? [],
    bebidas: bebidasByItem.get(d.menuItemId) ?? [],
  }));

  return {
    items,
    dailyAdicionales: dailyAdicionalRows,
    dailyBebidas: dailyBebidaRows,
  };
}

export async function getDailyMenuItemIds(dateStr: string) {
  const rows = await db
    .select({ menuItemId: dailyMenuItems.menuItemId })
    .from(dailyMenuItems)
    .where(eq(dailyMenuItems.date, dateStr));
  return rows.map((r) => r.menuItemId);
}

export async function getDailyAdicionalIds(dateStr: string) {
  const rows = await db
    .select({ adicionalId: dailyAdicionales.adicionalId })
    .from(dailyAdicionales)
    .where(eq(dailyAdicionales.date, dateStr));
  return rows.map((r) => r.adicionalId);
}

export async function getDailyBebidaIds(dateStr: string) {
  const rows = await db
    .select({ bebidaItemId: dailyBebidas.bebidaItemId })
    .from(dailyBebidas)
    .where(eq(dailyBebidas.date, dateStr));
  return rows.map((r) => r.bebidaItemId);
}
