import { db } from "../index";
import { menuItems, orders } from "../schema";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";

export interface MenuItemProfitability {
  id: string;
  name: string;
  priceUsdCents: number;
  costUsdCents: number | null;
  costUpdatedAt: string | null;
  marginPct: number | null;
}

export async function getMenuItemProfitability(): Promise<MenuItemProfitability[]> {
  const items = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      priceUsdCents: menuItems.priceUsdCents,
      costUsdCents: menuItems.costUsdCents,
      costUpdatedAt: menuItems.costUpdatedAt,
    })
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .orderBy(menuItems.sortOrder);

  return items.map((item) => ({
    ...item,
    costUpdatedAt: item.costUpdatedAt ? item.costUpdatedAt.toISOString() : null,
    marginPct: item.costUsdCents !== null && item.priceUsdCents > 0
      ? Math.round(((item.priceUsdCents - item.costUsdCents) / item.priceUsdCents) * 100)
      : null,
  }));
}

export interface WeightedMarginResult {
  weightedMarginPct: number | null;
  totalItemsSold: number;
}

export async function getWeightedAverageMarginToday(): Promise<WeightedMarginResult> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(new Date());
  const startOfDayVET = new Date(`${today}T00:00:00-04:00`);
  const endOfDayVET = new Date(`${today}T23:59:59-04:00`);

  // Get today's orders with items_snapshot
  const todayOrders = await db
    .select({
      itemsSnapshot: orders.itemsSnapshot,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfDayVET),
        lte(orders.createdAt, endOfDayVET),
        sql`${orders.status} IN ('paid', 'kitchen', 'delivered')`,
      ),
    );

  if (todayOrders.length === 0) {
    return { weightedMarginPct: null, totalItemsSold: 0 };
  }

  // Build a map of item costs from DB
  const costRows = await db
    .select({
      id: menuItems.id,
      priceUsdCents: menuItems.priceUsdCents,
      costUsdCents: menuItems.costUsdCents,
    })
    .from(menuItems)
    .where(isNotNull(menuItems.costUsdCents));

  const costMap = new Map<string, { priceUsdCents: number; costUsdCents: number }>();
  for (const row of costRows) {
    if (row.costUsdCents !== null) {
      costMap.set(row.id, { priceUsdCents: row.priceUsdCents, costUsdCents: row.costUsdCents });
    }
  }

  // Calculate weighted margin
  let totalRevenueUsdCents = 0;
  let totalCostUsdCents = 0;
  let totalItemsSold = 0;

  for (const order of todayOrders) {
    const snapshot = order.itemsSnapshot as Array<{
      id: string;
      priceUsdCents: number;
      quantity: number;
      costUsdCents?: number | null;
    }>;
    for (const item of snapshot) {
      const actualCostUsdCents =
        item.costUsdCents !== undefined && item.costUsdCents !== null
          ? item.costUsdCents
          : costMap.get(item.id)?.costUsdCents;

      if (actualCostUsdCents != null) {
        const revenue = item.priceUsdCents * item.quantity;
        const cost = actualCostUsdCents * item.quantity;
        totalRevenueUsdCents += revenue;
        totalCostUsdCents += cost;
        totalItemsSold += item.quantity;
      }
    }
  }

  if (totalRevenueUsdCents === 0) {
    return { weightedMarginPct: null, totalItemsSold };
  }

  const weightedMarginPct = Math.round(
    ((totalRevenueUsdCents - totalCostUsdCents) / totalRevenueUsdCents) * 100,
  );

  return { weightedMarginPct, totalItemsSold };
}
