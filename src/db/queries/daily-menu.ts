import { db } from "../index";
import {
  dailyMenuItems,
  menuItems,
  categories,
  optionGroups,
  options,
  menuItemAdicionales,
  menuItemContornos,
  menuItemBebidas,
  dailyAdicionales,
  dailyBebidas,
  dailyContornos,
} from "../schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { getSettings } from "./settings";
import { sortDailyMenuItems, type MenuItemSortMode } from "./sort-utils";

function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(date);
}

export async function getDailyMenuItemsForDate(dateStr: string) {
  return db
    .select({
      id: dailyMenuItems.id,
      categorySortOrder: categories.sortOrder,
      menuItemId: dailyMenuItems.menuItemId,
      date: dailyMenuItems.date,
      sortOrder: dailyMenuItems.sortOrder,
      itemName: menuItems.name,
      itemDescription: menuItems.description,
      itemIncludedNote: menuItems.includedNote,
      itemHideAdicionales: menuItems.hideAdicionales,
      itemHideBebidas: menuItems.hideBebidas,
      itemPriceUsdCents: menuItems.priceUsdCents,
      itemCategoryId: menuItems.categoryId,
      itemIsAvailable: dailyMenuItems.isAvailable,
      itemImageUrl: menuItems.imageUrl,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      categoryIsSimple: categories.isSimple,
    })
    .from(dailyMenuItems)
    .innerJoin(menuItems, eq(dailyMenuItems.menuItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(
      and(
        eq(dailyMenuItems.date, dateStr),
        eq(categories.isAvailable, true),
        eq(menuItems.isAvailable, true)
      )
    )
    .orderBy(categories.sortOrder, dailyMenuItems.sortOrder);
}

export async function getDailyBebidasAsMenuItemsForDate(dateStr: string) {
  return db
    .select({
      id: dailyBebidas.bebidaItemId,
      categorySortOrder: categories.sortOrder,
      menuItemId: dailyBebidas.bebidaItemId,
      date: dailyBebidas.date,
      sortOrder: dailyBebidas.sortOrder,
      itemName: menuItems.name,
      itemDescription: menuItems.description,
      itemPriceUsdCents: menuItems.priceUsdCents,
      itemCategoryId: menuItems.categoryId,
      itemIsAvailable: dailyBebidas.isAvailable,
      itemImageUrl: menuItems.imageUrl,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      categoryIsSimple: categories.isSimple,
    })
    .from(dailyBebidas)
    .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(
      and(
        eq(dailyBebidas.date, dateStr),
        eq(categories.isAvailable, true),
        eq(menuItems.isAvailable, true)
      )
    )
    .orderBy(categories.sortOrder, dailyBebidas.sortOrder);
}

export async function getDailyAdicionalesAsMenuItemsForDate(dateStr: string) {
  return db
    .select({
      id: dailyAdicionales.adicionalItemId,
      categorySortOrder: categories.sortOrder,
      menuItemId: dailyAdicionales.adicionalItemId,
      date: dailyAdicionales.date,
      sortOrder: dailyAdicionales.sortOrder,
      itemName: menuItems.name,
      itemDescription: menuItems.description,
      itemPriceUsdCents: menuItems.priceUsdCents,
      itemCategoryId: menuItems.categoryId,
      itemIsAvailable: dailyAdicionales.isAvailable,
      itemImageUrl: menuItems.imageUrl,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      categoryIsSimple: categories.isSimple,
    })
    .from(dailyAdicionales)
    .innerJoin(menuItems, eq(dailyAdicionales.adicionalItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(
      and(
        eq(dailyAdicionales.date, dateStr),
        eq(categories.isAvailable, true),
        eq(menuItems.isAvailable, true)
      )
    )
    .orderBy(categories.sortOrder, dailyAdicionales.sortOrder);
}

export async function getDailyContornosAsMenuItemsForDate(dateStr: string) {
  return db
    .select({
      id: dailyContornos.contornoItemId,
      categorySortOrder: categories.sortOrder,
      menuItemId: dailyContornos.contornoItemId,
      date: dailyContornos.date,
      sortOrder: dailyContornos.sortOrder,
      itemName: menuItems.name,
      itemDescription: menuItems.description,
      itemPriceUsdCents: menuItems.priceUsdCents,
      itemCategoryId: menuItems.categoryId,
      itemIsAvailable: dailyContornos.isAvailable,
      itemImageUrl: menuItems.imageUrl,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      categoryIsSimple: categories.isSimple,
    })
    .from(dailyContornos)
    .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(
      and(
        eq(dailyContornos.date, dateStr),
        eq(categories.isAvailable, true),
        eq(menuItems.isAvailable, true)
      )
    )
    .orderBy(categories.sortOrder, dailyContornos.sortOrder);
}

export async function getDailyMenuWithOptionsAndComponents(dateStr?: string) {
  const today = dateStr ?? formatLocalDate(new Date());

  const settings = await getSettings();
  const sortMode = (settings?.menuItemSortMode ?? "custom") as MenuItemSortMode;

  // Ola 1: data base — siempre necesaria para procesar el resto
  const dailyItemsData = await getDailyMenuItemsForDate(today);

  // Cortocircuito: si no hay items base, evita 3 queries pesadas de componentes
  if (dailyItemsData.length === 0) {
    return {
      items: [],
      dailyAdicionales: [],
      dailyBebidas: [],
      dailyContornos: [],
    };
  }

  // Ola 2: componentes en paralelo con fallback individual
  // Usamos casts explicitos para asegurar que el catch retorne el tipo correcto esperado por Drizzle/TS
  const [dailyBebidasData, dailyContornosData, dailyAdicionalesData] = await Promise.all([
    getDailyBebidasAsMenuItemsForDate(today).catch(() => [] as Awaited<ReturnType<typeof getDailyBebidasAsMenuItemsForDate>>),
    getDailyContornosAsMenuItemsForDate(today).catch(() => [] as Awaited<ReturnType<typeof getDailyContornosAsMenuItemsForDate>>),
    getDailyAdicionalesAsMenuItemsForDate(today).catch(() => [] as Awaited<ReturnType<typeof getDailyAdicionalesAsMenuItemsForDate>>),
  ]);

  const uniqueItemsMap = new Map();
  for (const item of dailyItemsData) uniqueItemsMap.set(item.menuItemId, item);
  for (const item of dailyBebidasData) uniqueItemsMap.set(item.menuItemId, item);
  for (const item of dailyContornosData) uniqueItemsMap.set(item.menuItemId, item);
  for (const item of dailyAdicionalesData) uniqueItemsMap.set(item.menuItemId, item);

  const dailyItems = sortDailyMenuItems(Array.from(uniqueItemsMap.values()), sortMode);

  const menuItemIds = dailyItems.map((d) => d.menuItemId);

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

  const adicionalRows = await db
    .select({
      menuItemId: menuItemAdicionales.menuItemId,
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(menuItems, eq(menuItemAdicionales.adicionalItemId, menuItems.id))
    .where(inArray(menuItemAdicionales.menuItemId, menuItemIds))
    .orderBy(menuItems.sortOrder);

  const dailyContornoIds = await db
    .select({ id: dailyContornos.contornoItemId })
    .from(dailyContornos)
    .where(eq(dailyContornos.date, today));
  const dailyContornoIdsSet = new Set(dailyContornoIds.map((c) => c.id));

  const dailyContornoIdArray = Array.from(dailyContornoIdsSet);

  // Only query contornos if there are daily contornos selected
  const contornoRows = dailyContornoIdArray.length === 0 ? [] : await db
    .select({
      menuItemId: menuItemContornos.menuItemId,
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
    .where(
      and(
        inArray(menuItemContornos.menuItemId, menuItemIds),
        inArray(menuItemContornos.contornoItemId, dailyContornoIdArray)
      )
    )
    .orderBy(menuItems.sortOrder);

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

  const dailyAdicionalRows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: dailyAdicionales.isAvailable,
      sortOrder: dailyAdicionales.sortOrder,
    })
    .from(dailyAdicionales)
    .innerJoin(menuItems, eq(dailyAdicionales.adicionalItemId, menuItems.id))
    .where(eq(dailyAdicionales.date, today))
    .orderBy(dailyAdicionales.sortOrder);

  const dailyBebidaRows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: dailyBebidas.isAvailable,
      sortOrder: dailyBebidas.sortOrder,
    })
    .from(dailyBebidas)
    .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
    .where(eq(dailyBebidas.date, today))
    .orderBy(dailyBebidas.sortOrder);

  const dailyContornoRows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      isAvailable: dailyContornos.isAvailable,
      sortOrder: dailyContornos.sortOrder,
    })
    .from(dailyContornos)
    .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
    .where(eq(dailyContornos.date, today))
    .orderBy(dailyContornos.sortOrder);

  const optionsByItem = new Map();
  for (const row of groupRows) {
    let groups = optionsByItem.get(row.menuItemId);
    if (!groups) {
      groups = [];
      optionsByItem.set(row.menuItemId, groups);
    }
    let group = groups.find((g: any) => g.id === row.groupId);
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

  const adicionalesByItem = new Map();
  for (const row of adicionalRows) {
    let list = adicionalesByItem.get(row.menuItemId);
    if (!list) {
      list = [];
      adicionalesByItem.set(row.menuItemId, list);
    }
    list.push(row);
  }

  const contornosByItem = new Map();
  for (const row of contornoRows) {
    let listCont = contornosByItem.get(row.menuItemId);
    if (!listCont) {
      listCont = [];
      contornosByItem.set(row.menuItemId, listCont);
    }

    // Filter substitutes to only those available today
    const activeSubstitutes = (row.substituteContornoIds || []).filter(id => dailyContornoIdsSet.has(id));

    listCont.push({
      ...row,
      substituteContornoIds: activeSubstitutes
    });
  }

  const bebidasByItem = new Map();
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
    includedNote: d.itemIncludedNote ?? null,
    hideAdicionales: d.itemHideAdicionales ?? false,
    hideBebidas: d.itemHideBebidas ?? false,
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
    dailyContornos: dailyContornoRows,
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
    .select({ adicionalItemId: dailyAdicionales.adicionalItemId })
    .from(dailyAdicionales)
    .where(eq(dailyAdicionales.date, dateStr));
  return rows.map((r) => r.adicionalItemId);
}

export async function getDailyBebidaIds(dateStr: string) {
  const rows = await db
    .select({ bebidaItemId: dailyBebidas.bebidaItemId })
    .from(dailyBebidas)
    .where(eq(dailyBebidas.date, dateStr));
  return rows.map((r) => r.bebidaItemId);
}

export async function getDailyContornoIds(dateStr: string) {
  const rows = await db
    .select({ contornoItemId: dailyContornos.contornoItemId })
    .from(dailyContornos)
    .where(eq(dailyContornos.date, dateStr));
  return rows.map((r) => r.contornoItemId);
}
