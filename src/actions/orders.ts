"use server";

import { auth } from "@/lib/auth";
import { updateOrderStatus as updateOrderStatusDb } from "@/db/queries/orders";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(
  orderId: string,
  status: "kitchen" | "delivered",
) {
  const session = await auth();
  if (!session?.user?.role || !["admin", "kitchen"].includes(session.user.role)) {
    return { success: false, error: "No autorizado" };
  }

  try {
    await updateOrderStatusDb(orderId, status);
    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar la orden" };
  }
}
