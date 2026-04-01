"use server";

import { auth } from "@/lib/auth";
import { updateOrderStatus as updateOrderStatusService } from "@/services/order.service";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import { authenticatedActionClient } from "@/lib/safe-action";

export const updateOrderStatusAction = authenticatedActionClient
  .schema(
    v.object({
      orderId: v.string(),
      status: v.picklist(["kitchen", "delivered"]),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "kitchen"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    await updateOrderStatusService(parsedInput.orderId, parsedInput.status);
    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    return { success: true };
  });


