import { getDailyMenuWithOptionsAndComponents } from "@/db/queries/daily-menu";
import { getCategories } from "@/db/queries/menu";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { getAllTables } from "@/db/queries/restaurant-tables";
import { getAllFixtures } from "@/db/queries/floor-fixtures";
import { getKitchenOrdersSimple } from "@/db/queries/orders";
import { WaiterOrderClient } from "@/components/waiter/WaiterOrderClient";

export default async function WaiterPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: prefilledTable } = await searchParams;

  // Start of today in America/Caracas timezone
  const todayCaracas = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }); // YYYY-MM-DD
  const todayStart = new Date(`${todayCaracas}T00:00:00-04:00`);

  const [dailyMenuData, categories, rateData, allContornos, settings, tables, fixtures, activeOrders] = await Promise.all([
    getDailyMenuWithOptionsAndComponents().catch(() => ({ items: [], dailyAdicionales: [], dailyBebidas: [] })),
    getCategories().catch(() => []),
    getActiveRate().catch(() => null),
    getAllContornos().catch(() => []),
    getSettings().catch(() => null),
    getAllTables().catch(() => []),
    getAllFixtures().catch(() => []),
    getKitchenOrdersSimple(todayStart).catch(() => []),
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
      activeOrders={activeOrders}
    />
  );
}
