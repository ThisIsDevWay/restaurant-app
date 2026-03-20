import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function AdminOrdersPage() {
  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return <OrdersClient orders={allOrders} />;
}
