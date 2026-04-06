import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const rawDate = url.searchParams.get("date");
        let targetDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
        if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            targetDate = rawDate;
        }

        const allOrders = await db
            .select({
                id: orders.id,
                orderNumber: orders.orderNumber,
                status: orders.status,
                subtotalBsCents: orders.subtotalBsCents,
                customerPhone: orders.customerPhone,
                createdAt: orders.createdAt,
                paymentMethod: orders.paymentMethod,
                paymentProvider: orders.paymentProvider,
                itemsSnapshot: orders.itemsSnapshot,
                orderMode: orders.orderMode,
            })
            .from(orders)
            .where(sql`date(timezone('America/Caracas', ${orders.createdAt})) = ${targetDate}`)
            .orderBy(desc(orders.createdAt))
            .limit(300);

        return NextResponse.json(allOrders);
    } catch (err) {
        console.error("Failed to fetch orders:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
