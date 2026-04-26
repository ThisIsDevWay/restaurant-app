"use server";
import * as v from "valibot";
import { authenticatedActionClient } from "@/lib/safe-action";
import { calculateOrderTotals } from "@/services/order.service";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { createOrderWithCapacityCheck } from "@/db/queries/orders";
import { db } from "@/db";
import { printJobs } from "@/db/schema";
import { generateTicketText } from "@/lib/print-formatter";
import { formatOrderDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { CheckoutItem } from "@/lib/types/checkout";

const waiterOrderSchema = v.object({
  tableNumber: v.pipe(v.string(), v.minLength(1, "Mesa requerida")),
  customerName: v.optional(v.string()),
  paymentMethod: v.picklist([
    "cash",
    "cash_usd",
    "cash_bs",
    "pos",
    "pago_movil",
    "zelle",
    "transfer",
    "binance",
  ]),
  items: v.any(), // CheckoutItem[] — validado en service
});

export const createWaiterOrderAction = authenticatedActionClient
  .schema(waiterOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Guard: solo admin o waiter
    if (!["admin", "waiter"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");

    const rateResult = await getActiveRate();
    if (!rateResult) throw new Error("Tasa de cambio no disponible");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
    }).format(new Date());

    const items = parsedInput.items as CheckoutItem[];

    const { snapshotItems, subtotalUsdCents, subtotalBsCents } =
      await calculateOrderTotals(items, rateResult.rate, today);

    const grandTotalUsdCents = subtotalUsdCents; // sin surcharges (on_site sin empaque)
    const grandTotalBsCents = subtotalBsCents;

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // expira en 8h

    const { order, reason } = await createOrderWithCapacityCheck(
      {
        customerPhone: parsedInput.customerName 
          ? `mesero-${parsedInput.customerName.substring(0, 15)}` 
          : `mesa-${parsedInput.tableNumber}`, 
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        packagingUsdCents: 0,
        deliveryUsdCents: 0,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: null,
        status: "kitchen", // Va directo a cocina
        paymentMethod: parsedInput.paymentMethod,
        paymentProvider: "whatsapp_manual", // provider dummy; el pago es presencial
        orderMode: "on_site",
        tableNumber: parsedInput.tableNumber,
        customerName: parsedInput.customerName || null,
        deliveryAddress: null,
        gpsCoords: null,
        exchangeRateId: settings.currentRateId!,
        rateSnapshotBsPerUsd: rateResult.rate.toString(),
        expiresAt,
        checkoutToken: null,
      },
      999 // sin límite de capacidad para pedidos de mesero
    );

    if (reason === "capacity_exceeded") {
      throw new Error("Capacidad máxima alcanzada.");
    }
    if (!order) throw new Error("Error al crear la orden");

    // Generar texto para el ticket
    const ticketText = generateTicketText({
      orderNumber: order.orderNumber,
      tableNumber: parsedInput.tableNumber,
      customerName: parsedInput.customerName,
      items: snapshotItems,
      totalBsCents: grandTotalBsCents,
      totalUsdCents: grandTotalUsdCents,
      date: formatOrderDate(new Date()),
      paymentMethod: parsedInput.paymentMethod,
      waiterName: ctx.user.name ?? undefined,
      orderMode: "on_site",
      restaurantName: settings.restaurantName,
    });

    // Crear trabajo de impresión
    await db.insert(printJobs).values({
      orderId: order.id,
      copies: 2,
      rawContent: ticketText,
      status: "pending",
      target: "main",
    });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  });
