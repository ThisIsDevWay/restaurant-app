import { db } from "../index";
import { customers } from "../schema";
import { eq } from "drizzle-orm";

export async function getCustomerByPhone(phone: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);
  return row ?? null;
}

export async function upsertCustomer(
  phone: string,
  name?: string | null,
  cedula?: string | null,
) {
  const existing = await getCustomerByPhone(phone);

  if (existing) {
    const [row] = await db
      .update(customers)
      .set({
        name: name ?? existing.name,
        cedula: cedula ?? existing.cedula,
        updatedAt: new Date(),
      })
      .where(eq(customers.phone, phone))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(customers)
    .values({ phone, name: name ?? null, cedula: cedula ?? null })
    .returning();
  return row;
}
