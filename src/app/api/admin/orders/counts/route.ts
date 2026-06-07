import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sql } from "drizzle-orm";
import * as v from "valibot";
import { dateStringSchema } from "@/lib/validations/date";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
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

    const [result] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
        whatsapp: sql<number>`count(*) filter (where status = 'whatsapp')::int`,
        paid: sql<number>`count(*) filter (where status = 'paid')::int`,
        kitchen: sql<number>`count(*) filter (where status = 'kitchen')::int`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')::int`,
        expired: sql<number>`count(*) filter (where status = 'expired')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
      })
      .from(orders)
      .where(sql`date(timezone('America/Caracas', ${orders.createdAt})) = ${targetDate}`);

    return NextResponse.json({
      all: result.total,
      pending: result.pending + result.whatsapp,
      preparing: result.paid + result.kitchen,
      history: result.delivered + result.expired + result.failed + result.cancelled,
    });
  } catch (err) {
    logger.error("Failed to fetch order counts", { error: String(err) });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
