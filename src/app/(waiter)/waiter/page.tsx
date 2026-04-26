import { getDailyMenuWithOptionsAndComponents } from "@/db/queries/daily-menu";
import { getCategories } from "@/db/queries/menu";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { getAllTables } from "@/db/queries/restaurant-tables";
import { getAllFixtures } from "@/db/queries/floor-fixtures";
import { WaiterOrderClient } from "@/components/waiter/WaiterOrderClient";

export default async function WaiterPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: prefilledTable } = await searchParams;
  
  const [dailyMenuData, categories, rateData, allContornos, settings, tables, fixtures] = await Promise.all([
    getDailyMenuWithOptionsAndComponents().catch(() => ({ items: [], dailyAdicionales: [], dailyBebidas: [] })),
    getCategories().catch(() => []),
    getActiveRate().catch(() => null),
    getAllContornos().catch(() => []),
    getSettings().catch(() => null),
    getAllTables().catch(() => []),
    getAllFixtures().catch(() => []),
  ]);

  return (
    <WaiterOrderClient
      items={dailyMenuData.items}
      categories={categories.filter(c => c.isAvailable)}
      dailyAdicionales={dailyMenuData.dailyAdicionales}
      dailyBebidas={dailyMenuData.dailyBebidas}
      allContornos={allContornos}
      rate={rateData?.rate ?? 0}
      settings={settings}
      prefilledTable={prefilledTable}
      tables={tables}
      fixtures={fixtures}
    />
  );
}
