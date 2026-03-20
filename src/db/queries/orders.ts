import { db } from "../index";
import { orders } from "../schema";
import { eq, and, lt, sql } from "drizzle-orm";

export async function getOrderById(id: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return order;
}

export async function getOrderStatus(id: string) {
  const [result] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return result;
}

export async function getPendingOrdersCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  return result.count;
}

export async function createOrder(data: typeof orders.$inferInsert) {
  const [order] = await db.insert(orders).values(data).returning();
  return order;
}

export async function updateOrderStatus(
  id: string,
  status: typeof orders.$inferSelect.status,
  paymentLogId?: string,
  paymentReference?: string,
) {
  const [order] = await db
    .update(orders)
    .set({
      status,
      paymentLogId: paymentLogId ?? undefined,
      paymentReference: paymentReference ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();
  return order;
}

export async function expirePendingOrders() {
  const result = await db
    .update(orders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.expiresAt, new Date()),
      ),
    );
  return result;
}

export async function getKitchenOrdersSimple() {
  return db
    .select()
    .from(orders)
    .where(
      sql`${orders.status} IN ('paid', 'kitchen', 'whatsapp')`,
    )
    .orderBy(orders.createdAt);
}
