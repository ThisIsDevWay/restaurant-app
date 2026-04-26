import { db } from "../index";
import { orders } from "../schema";
import { sql, desc, and, gte, lte } from "drizzle-orm";
import { todayCaracas } from "@/lib/utils/date";

export async function getDashboardStats() {
    const today = todayCaracas();
    const startOfDayVET = new Date(`${today}T00:00:00-04:00`);
    const endOfDayVET = new Date(`${today}T23:59:59-04:00`);

    const [stats] = await db
        .select({
            totalSales: sql<number>`COALESCE(SUM(${orders.subtotalBsCents}), 0)::int`,
            completedOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('paid', 'kitchen', 'delivered'))::int`,
            pendingOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')::int`,
        })
        .from(orders)
        .where(
            and(
                gte(orders.createdAt, startOfDayVET),
                lte(orders.createdAt, endOfDayVET),
            ),
        );

    return stats;
}

export async function getRecentOrders(limit = 10) {
    const today = todayCaracas();
    const startOfDayVET = new Date(`${today}T00:00:00-04:00`);
    const endOfDayVET = new Date(`${today}T23:59:59-04:00`);

    return db
        .select({
            id: orders.id,
            status: orders.status,
            subtotalBsCents: orders.subtotalBsCents,
            customerPhone: orders.customerPhone,
            createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
            and(
                gte(orders.createdAt, startOfDayVET),
                lte(orders.createdAt, endOfDayVET),
            ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(limit);
}

export async function getTodayOrdersRaw() {
    const today = todayCaracas();
    const startOfDayVET = new Date(`${today}T00:00:00-04:00`);
    const endOfDayVET = new Date(`${today}T23:59:59-04:00`);

    return db
        .select({ 
            itemsSnapshot: orders.itemsSnapshot, 
            createdAt: orders.createdAt,
            subtotalBsCents: orders.subtotalBsCents 
        })
        .from(orders)
        .where(
            and(
                gte(orders.createdAt, startOfDayVET),
                lte(orders.createdAt, endOfDayVET),
                sql`${orders.status} IN ('paid', 'kitchen', 'delivered')`,
            ),
        );
}
