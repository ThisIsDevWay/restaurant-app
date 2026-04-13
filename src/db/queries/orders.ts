import { db } from "../index";
import { orders } from "../schema";
import { eq, and, lt, sql, inArray } from "drizzle-orm";

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
    .where(inArray(orders.status, ["pending", "whatsapp"]));

  return result?.count ?? 0;
}

export async function createOrderWithCapacityCheck(
  data: typeof orders.$inferInsert,
  maxPending: number,
): Promise<{ order: typeof orders.$inferSelect | null; reason: "capacity_exceeded" | null }> {
  return await db.transaction(async (tx) => {
    // Use an advisory lock to serialize the capacity check.
    // hashtext() provides a stable integer ID for the lock name.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('orders_capacity_check'), 1)`);

    // 1. Idempotency Check: if checkoutToken exists, return/update existing order
    if (data.checkoutToken) {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.checkoutToken, data.checkoutToken))
        .limit(1);

      if (existingOrder) {
        const updateableStatuses = ["pending", "whatsapp"];
        const isExpired = existingOrder.expiresAt < new Date();

        if (updateableStatuses.includes(existingOrder.status) && !isExpired) {
          console.log(`[Idempotency] Updating existing ${existingOrder.status} order ${existingOrder.id} for token ${data.checkoutToken}`);
          const [updatedOrder] = await tx
            .update(orders)
            .set({
              ...data,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, existingOrder.id))
            .returning();
          return { order: updatedOrder, reason: null };
        } else {
          // If already paid, or expired, or other status, ignore the token on the old order 
          // and allow the new order to inherit it.
          console.log(`[Idempotency] Order ${existingOrder.id} for token ${data.checkoutToken} is not updateable (status=${existingOrder.status}, isExpired=${isExpired}). Creating replacement.`);

          // Null out the token in the old order to avoid UNIQUE constraint violation on the NEW order
          await tx
            .update(orders)
            .set({ checkoutToken: null, updatedAt: new Date() })
            .where(eq(orders.id, existingOrder.id));

          // data.checkoutToken remains intact so the new order will use it
        }
      }
    }

    // 2. Capacity Check
    const [result] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(inArray(orders.status, ["pending", "whatsapp"]));

    if ((result?.count ?? 0) >= maxPending) {
      return { order: null, reason: "capacity_exceeded" };
    }

    // 3. Insert new order
    const [newOrder] = await tx.insert(orders).values(data).returning();
    return { order: newOrder, reason: null };
  });
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
        inArray(orders.status, ["pending", "whatsapp"]),
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
