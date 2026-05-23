"use server";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import { db } from "@/db";
import { printJobs, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateTicketText } from "@/lib/print-formatter";
import { formatOrderDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getSettings } from "@/db/queries/settings";

const reprintSchema = v.object({
  orderId: v.string(),
  target: v.optional(v.string(), "main"),
  copies: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
});

export const reprintOrderAction = adminActionClient
  .schema(reprintSchema)
  .action(async ({ parsedInput }) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parsedInput.orderId),
    });

    if (!order) throw new Error("Orden no encontrada");

    const settings = await getSettings();

    const ticketText = generateTicketText({
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber || "N/A",
      items: order.itemsSnapshot as any[],
      totalBsCents: order.grandTotalBsCents,
      totalUsdCents: order.grandTotalUsdCents,
      date: formatOrderDate(new Date(order.createdAt)),
    });

    const printers = settings?.printerTargets && settings.printerTargets.length > 0
      ? settings.printerTargets
      : [{ name: "main", copies: 2, reprintCopies: 1, enabled: true }];

    if (parsedInput.target && parsedInput.target !== "main") {
      const printer = printers.find(p => p.name === parsedInput.target);
      const reprintCopiesCount = parsedInput.copies ?? printer?.reprintCopies ?? 1;

      await db.insert(printJobs).values({
        orderId: order.id,
        copies: reprintCopiesCount,
        rawContent: ticketText,
        status: "pending",
        target: parsedInput.target,
      });
    } else {
      const activePrinters = printers.filter(p => p.enabled && p.name.trim() !== "");
      if (activePrinters.length > 0) {
        await db.insert(printJobs).values(
          activePrinters.map(p => ({
            orderId: order.id,
            copies: parsedInput.copies ?? p.reprintCopies ?? 1,
            rawContent: ticketText,
            status: "pending" as const,
            target: p.name,
          }))
        );
      }
    }

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return { success: true };
  });
