"use server";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import { db } from "@/db";
import { printJobs, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateTicketText } from "@/lib/print-formatter";
import { formatOrderDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const reprintSchema = v.object({
  orderId: v.string(),
  target: v.optional(v.string(), "main"),
});

export const reprintOrderAction = adminActionClient
  .schema(reprintSchema)
  .action(async ({ parsedInput }) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parsedInput.orderId),
    });

    if (!order) throw new Error("Orden no encontrada");

    const ticketText = generateTicketText({
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber || "N/A",
      items: order.itemsSnapshot as any[],
      totalBsCents: order.grandTotalBsCents,
      totalUsdCents: order.grandTotalUsdCents,
      date: formatOrderDate(new Date(order.createdAt)),
    });

    await db.insert(printJobs).values({
      orderId: order.id,
      copies: 1,
      rawContent: ticketText,
      status: "pending",
      target: parsedInput.target,
    });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return { success: true };
  });
