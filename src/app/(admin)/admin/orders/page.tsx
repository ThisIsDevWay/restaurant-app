import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function AdminOrdersPage() {
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
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return <OrdersClient orders={allOrders} />;
}
