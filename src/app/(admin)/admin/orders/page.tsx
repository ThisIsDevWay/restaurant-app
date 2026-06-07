import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";
import { ORDER_LIST_COLUMNS } from "@/db/queries/orders";
import * as v from "valibot";
import { dateStringSchema } from "@/lib/validations/date";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Use user's selected date from query, or default to current date in Caracas
  const rawDate = resolvedSearchParams.date as string | undefined;
  let targetDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }); // YYYY-MM-DD
  
  if (rawDate) {
    const result = v.safeParse(dateStringSchema, rawDate);
    if (result.success) {
      targetDate = result.output;
    }
  }

  const allOrders = await db
    .select(ORDER_LIST_COLUMNS)
    .from(orders)
    .where(sql`date(timezone('America/Caracas', ${orders.createdAt})) = ${targetDate}`)
    .orderBy(desc(orders.createdAt))
    .limit(300); // Increased limit slightly for busy days

  return <OrdersClient orders={allOrders} initialDate={targetDate} />;
}
