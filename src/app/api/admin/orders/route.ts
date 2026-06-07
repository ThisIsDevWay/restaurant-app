import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ORDER_LIST_COLUMNS } from "@/db/queries/orders";
import * as v from "valibot";
import { dateStringSchema } from "@/lib/validations/date";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const rawDate = url.searchParams.get("date");
        let targetDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
        
        if (rawDate) {
            const result = v.safeParse(dateStringSchema, rawDate);
            if (result.success) {
                targetDate = result.output;
            } else {
                return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
            }
        }

        const allOrders = await db
            .select(ORDER_LIST_COLUMNS)
            .from(orders)
            .where(sql`date(timezone('America/Caracas', ${orders.createdAt})) = ${targetDate}`)
            .orderBy(desc(orders.createdAt))
            .limit(300);

        return NextResponse.json(allOrders);
    } catch (err) {
        logger.error("Failed to fetch orders", { error: String(err) });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
