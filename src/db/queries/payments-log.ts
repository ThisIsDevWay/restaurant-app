import { db } from "../index";
import { paymentsLog } from "../schema";
import { eq } from "drizzle-orm";

export async function createPaymentLog(data: typeof paymentsLog.$inferInsert) {
  const [log] = await db.insert(paymentsLog).values(data).returning();
  return log;
}

export async function findPaymentByReference(reference: string) {
  const [log] = await db
    .select()
    .from(paymentsLog)
    .where(eq(paymentsLog.reference, reference))
    .limit(1);
  return log;
}
