"use server";
import { authenticatedActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { printAllTickets } from "@/lib/print/enqueue";
import { revalidatePath } from "next/cache";

const reprintSchema = v.object({
  orderId: v.string(),
});

export const reprintOrderAction = authenticatedActionClient
  .schema(reprintSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "cashier"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parsedInput.orderId),
    });
    if (!order) throw new Error("Orden no encontrada");

    // Reimprime todos los tickets relevantes (cocina/barra/caja) reconstruidos
    // desde la orden completa, usando las copias de reimpresión por impresora.
    await printAllTickets(order, { reprint: true });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return { success: true };
  });
