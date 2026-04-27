"use server";
import * as v from "valibot";
import { authenticatedActionClient } from "@/lib/safe-action";
import { calculateOrderTotals } from "@/services/order.service";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { createOrderWithCapacityCheck } from "@/db/queries/orders";
import { db } from "@/db";
import { printJobs, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateTicketText } from "@/lib/print-formatter";
import { formatOrderDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { CheckoutItem } from "@/lib/types/checkout";

const waiterOrderSchema = v.object({
  tableNumber: v.pipe(v.string(), v.minLength(1, "Mesa requerida")),
  customerName: v.optional(v.string()),
  paymentMethod: v.picklist([
    "Efectivo $",
    "Efectivo Bs",
    "Pago Móvil",
    "Punto / PdV",
    "Zelle",
    "Transf.",
    "Binance",
  ]),
  items: v.any(), // CheckoutItem[] — validado en service
});

const updateWaiterOrderSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  tableNumber: v.pipe(v.string(), v.minLength(1, "Mesa requerida")),
  customerName: v.optional(v.string()),
  paymentMethod: v.picklist([
    "Efectivo $",
    "Efectivo Bs",
    "Pago Móvil",
    "Punto / PdV",
    "Zelle",
    "Transf.",
    "Binance",
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

    const applyIgtf = settings.applyIgtf;
    const igtfPercentage = Number(settings.igtfPercentage) || 3;
    const isForeignCurrency = parsedInput.paymentMethod === "Efectivo $" || parsedInput.paymentMethod === "Zelle" || parsedInput.paymentMethod === "Binance";

    const igtfUsdCents = (applyIgtf && isForeignCurrency) ? Math.round(subtotalUsdCents * (igtfPercentage / 100)) : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents; // sin surcharges (on_site sin empaque)
    const grandTotalBsCents = subtotalBsCents + igtfBsCents;

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
        igtfUsdCents,
        igtfBsCents,
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
      igtfBsCents,
      igtfUsdCents,
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

export const updateWaiterOrderAction = authenticatedActionClient
  .schema(updateWaiterOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
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

    const applyIgtf = settings.applyIgtf;
    const igtfPercentage = Number(settings.igtfPercentage) || 3;
    const isForeignCurrency = parsedInput.paymentMethod === "Efectivo $" || parsedInput.paymentMethod === "Zelle" || parsedInput.paymentMethod === "Binance";

    const igtfUsdCents = (applyIgtf && isForeignCurrency) ? Math.round(subtotalUsdCents * (igtfPercentage / 100)) : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents;
    const grandTotalBsCents = subtotalBsCents + igtfBsCents;

    const [order] = await db
      .update(orders)
      .set({
        customerPhone: parsedInput.customerName
          ? `mesero-${parsedInput.customerName.substring(0, 15)}`
          : `mesa-${parsedInput.tableNumber}`,
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        paymentMethod: parsedInput.paymentMethod,
        tableNumber: parsedInput.tableNumber,
        customerName: parsedInput.customerName || null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, parsedInput.id))
      .returning();

    if (!order) throw new Error("Error al actualizar la orden");

    // Generar texto para el ticket
    const ticketText = generateTicketText({
      orderNumber: order.orderNumber,
      tableNumber: parsedInput.tableNumber,
      customerName: parsedInput.customerName,
      items: snapshotItems,
      totalBsCents: grandTotalBsCents,
      totalUsdCents: grandTotalUsdCents,
      igtfBsCents,
      igtfUsdCents,
      date: formatOrderDate(new Date()),
      paymentMethod: parsedInput.paymentMethod,
      waiterName: ctx.user.name ?? undefined,
      orderMode: "on_site",
      restaurantName: settings.restaurantName,
      isUpdate: true,
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
