import { getMenuWithOptions, getCategories, getSimpleMenuItems } from "@/db/queries/menu";
import { getActiveRate } from "@/db/queries/settings";
import { db } from "@/db";
import { menuItemContornos, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import MenuCatalogView from "./MenuCatalogView";

export default async function MenuAdminPage() {
  const [items, categories, availableContornos, rateResult, allContornos] = await Promise.all([
    getMenuWithOptions(),
    getCategories(),
    getSimpleMenuItems(),
    getActiveRate().catch(() => null),
    db
      .select({
        menuItemId: menuItemContornos.menuItemId,
        id: menuItems.id,
        name: menuItems.name,
        removable: menuItemContornos.removable,
      })
      .from(menuItemContornos)
      .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
      .catch(() => []),
  ]);

  const contornosMap: Record<string, Array<{ id: string; name: string; removable: boolean }>> = {};
  for (const c of allContornos) {
    if (!contornosMap[c.menuItemId]) {
      contornosMap[c.menuItemId] = [];
    }
    contornosMap[c.menuItemId].push({
      id: c.id,
      name: c.name,
      removable: c.removable,
    });
  }

  const itemsWithContornos = items.map((item) => ({
    ...item,
    contornos: contornosMap[item.id] ?? [],
  }));

  return (
    <MenuCatalogView
      items={itemsWithContornos}
      categories={categories}
      availableContornos={availableContornos}
      exchangeRate={rateResult?.rate ?? 0}
    />
  );
}