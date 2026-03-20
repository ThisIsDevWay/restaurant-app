import { db } from "../index";
import { menuItems, optionGroups, options, categories, dishComponents } from "../schema";
import { eq, and } from "drizzle-orm";

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

  const componentRows = await db
    .select()
    .from(dishComponents)
    .orderBy(dishComponents.sortOrder);

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

  const componentsByItem = new Map<string, typeof componentRows>();
  for (const comp of componentRows) {
    let list = componentsByItem.get(comp.menuItemId);
    if (!list) {
      list = [];
      componentsByItem.set(comp.menuItemId, list);
    }
    list.push(comp);
  }

  return items.map((item) => ({
    ...item,
    optionGroups: optionsByItem.get(item.id) ?? [],
    dishComponents: componentsByItem.get(item.id) ?? [],
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

  return { ...item, optionGroups: groupsWithOptions };
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

  const components = await db
    .select()
    .from(dishComponents)
    .where(eq(dishComponents.menuItemId, id))
    .orderBy(dishComponents.sortOrder);

  return { ...item, optionGroups: groupsWithOptions, dishComponents: components };
}

export async function getCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      sortOrder: categories.sortOrder,
      allowAlone: categories.allowAlone,
    })
    .from(categories)
    .orderBy(categories.sortOrder);
}
