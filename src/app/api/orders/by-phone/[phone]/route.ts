import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;
  const sanitized = phone.replace(/\D/g, "");

  if (sanitized.length < 7) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  const recentOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      subtotalBsCents: orders.subtotalBsCents,
      createdAt: orders.createdAt,
      expiresAt: orders.expiresAt,
      itemsSnapshot: orders.itemsSnapshot,
    })
    .from(orders)
    .where(eq(orders.customerPhone, sanitized))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  return NextResponse.json({ orders: recentOrders });
}
