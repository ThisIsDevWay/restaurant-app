import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Use user's selected date from query, or default to current date in Caracas
  const rawDate = resolvedSearchParams.date as string | undefined;
  let targetDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }); // YYYY-MM-DD
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    targetDate = rawDate;
  }

  const allOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotalBsCents: orders.subtotalBsCents,
      grandTotalBsCents: orders.grandTotalBsCents,
      customerPhone: orders.customerPhone,
      createdAt: orders.createdAt,
      paymentMethod: orders.paymentMethod,
      paymentProvider: orders.paymentProvider,
      itemsSnapshot: orders.itemsSnapshot,
      orderMode: orders.orderMode,
      tableNumber: orders.tableNumber,
    })
    .from(orders)
    .where(sql`date(timezone('America/Caracas', ${orders.createdAt})) = ${targetDate}`)
    .orderBy(desc(orders.createdAt))
    .limit(300); // Increased limit slightly for busy days

  return <OrdersClient orders={allOrders} initialDate={targetDate} />;
}
