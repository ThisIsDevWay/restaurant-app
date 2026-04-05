import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

import { rateLimiters, getIP } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ phone: string }> },
) {
  const ip = getIP(req);
  const { success } = await rateLimiters.lookup.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { phone } = await params;
  const sanitized = phone.replace(/\D/g, "");

  if (sanitized.length < 7) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotalBsCents: orders.subtotalBsCents,
      grandTotalBsCents: orders.grandTotalBsCents,
      createdAt: orders.createdAt,
      expiresAt: orders.expiresAt,
      itemsSnapshot: orders.itemsSnapshot,
      deliveryAddress: orders.deliveryAddress,
    })
    .from(orders)
    .where(eq(orders.customerPhone, sanitized))
    .orderBy(desc(orders.createdAt))
    .limit(15);

  // Mask sensitive data (PII protection)
  const maskedOrders = recentOrders.map((order) => ({
    ...order,
    deliveryAddress:
      order.deliveryAddress && order.deliveryAddress.length > 8
        ? `${order.deliveryAddress.slice(0, 4)}...${order.deliveryAddress.slice(-4)}`
        : order.deliveryAddress,
  }));

  return NextResponse.json({ orders: maskedOrders });
}
