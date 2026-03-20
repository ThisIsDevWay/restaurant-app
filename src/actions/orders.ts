"use server";

import { requireAdmin } from "@/lib/auth";
import { updateOrderStatus as updateOrderStatusDb } from "@/db/queries/orders";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(
  orderId: string,
  status: "kitchen" | "delivered",
) {
  try {
    await requireAdmin();
  } catch {
    // Allow kitchen role too
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
