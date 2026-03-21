import { db } from "../index";
import { menuItems, optionGroups, options, categories, adicionales, menuItemAdicionales, contornos, menuItemContornos } from "../schema";
import { eq } from "drizzle-orm";

export async function getMenuWithOptions() {
  const items = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      priceUsdCents: menuItems.priceUsdCents,
      categoryId: menuItems.categoryId,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      isAvailable: menuItems.isAvailable,
      imageUrl: menuItems.imageUrl,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .orderBy(categories.sortOrder, menuItems.sortOrder);

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
    .orderBy(optionGroups.sortOrder, options.sortOrder);

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

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
  }));
}

export async function getMenuWithOptionsAndComponents() {
  const items = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      priceUsdCents: menuItems.priceUsdCents,
      categoryId: menuItems.categoryId,
      categoryName: categories.name,
      categoryAllowAlone: categories.allowAlone,
      isAvailable: menuItems.isAvailable,
      imageUrl: menuItems.imageUrl,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(eq(categories.isAvailable, true))
    .orderBy(categories.sortOrder, menuItems.sortOrder);

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
    .orderBy(optionGroups.sortOrder, options.sortOrder);

  // Fetch adicionales assignments
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
    .orderBy(adicionales.sortOrder);

  // Fetch contornos assignments
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
    .orderBy(contornos.sortOrder);

  const optionsByItem = new Map<string, Array<{
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
  }>>();

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

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
    adicionales: adicionalesByItem.get(item.id) ?? [],
    contornos: contornosByItem.get(item.id) ?? [],
  }));
}

export async function getAvailableMenuItems() {
  return db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .orderBy(menuItems.sortOrder);
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
      id: contornos.id,
      name: contornos.name,
      priceUsdCents: contornos.priceUsdCents,
      isAvailable: contornos.isAvailable,
      removable: menuItemContornos.removable,
      substituteContornoIds: menuItemContornos.substituteContornoIds,
    })
    .from(menuItemContornos)
    .innerJoin(contornos, eq(menuItemContornos.contornoId, contornos.id))
    .where(eq(menuItemContornos.menuItemId, id))
    .orderBy(contornos.sortOrder);

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
      id: adicionales.id,
      name: adicionales.name,
      priceUsdCents: adicionales.priceUsdCents,
      isAvailable: adicionales.isAvailable,
      sortOrder: adicionales.sortOrder,
    })
    .from(menuItemAdicionales)
    .innerJoin(adicionales, eq(menuItemAdicionales.adicionalId, adicionales.id))
    .where(eq(menuItemAdicionales.menuItemId, id))
    .orderBy(adicionales.sortOrder);

  // Fetch contornos assigned to this menu item
  const itemContornos = await db
    .select({
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
    .where(eq(menuItemContornos.menuItemId, id))
    .orderBy(contornos.sortOrder);

  return {
    ...item,
    optionGroups: groupsWithOptions,
    adicionales: itemAdicionales,
    contornos: itemContornos,
  };
}

export async function getCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      sortOrder: categories.sortOrder,
      allowAlone: categories.allowAlone,
      isAvailable: categories.isAvailable,
    })
    .from(categories)
    .orderBy(categories.sortOrder);
}
