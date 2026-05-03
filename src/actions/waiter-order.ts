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
import { calculateSurcharges, buildSurchargesSnapshot } from "@/lib/utils/calculate-surcharges";
import { usdCentsToBsCents } from "@/lib/money";
import type { CheckoutItem } from "@/lib/types/checkout";

const waiterOrderSchema = v.object({
  tableNumber: v.pipe(v.string(), v.minLength(1, "Requerido")),
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
  orderMode: v.picklist(["on_site", "take_away", "delivery"]),
  customerPhone: v.optional(v.string()),
  paymentReference: v.optional(v.string()),
  items: v.any(), // CheckoutItem[] — validado en service
});

const updateWaiterOrderSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  tableNumber: v.pipe(v.string(), v.minLength(1, "Requerido")),
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
  orderMode: v.picklist(["on_site", "take_away", "delivery"]),
  customerPhone: v.optional(v.string()),
  paymentReference: v.optional(v.string()),
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
    const isForeignCurrency =
      parsedInput.paymentMethod === "Efectivo $" ||
      parsedInput.paymentMethod === "Zelle" ||
      parsedInput.paymentMethod === "Binance";

    const surchargeItems = snapshotItems.map((item) => ({
      categoryIsSimple: items.find((i) => i.id === item.id)?.categoryIsSimple ?? false,
      categoryName: items.find((i) => i.id === item.id)?.categoryName ?? "",
      quantity: item.quantity,
      isPrepackaged: item.isPrepackaged,
      selectedAdicionales: item.selectedAdicionales.map((a) => ({
        quantity: a.quantity,
        isPrepackaged: a.isPrepackaged,
        substitutesComponentId: a.substitutesComponentId,
      })),
      selectedBebidas: item.selectedBebidas.map((b) => ({
        quantity: b.quantity,
        isPrepackaged: b.isPrepackaged,
      })),
    }));

    const serverSurcharges = calculateSurcharges(surchargeItems, parsedInput.orderMode, {
      packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
      packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents,
      packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
      deliveryFeeUsdCents: settings.deliveryFeeUsdCents,
    });

    const igtfUsdCents =
      applyIgtf && isForeignCurrency
        ? Math.round((subtotalUsdCents + serverSurcharges.totalSurchargeUsdCents) * (igtfPercentage / 100))
        : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents + serverSurcharges.totalSurchargeUsdCents;
    const grandTotalBsCents =
      subtotalBsCents + igtfBsCents + usdCentsToBsCents(serverSurcharges.totalSurchargeUsdCents, rateResult.rate);

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // expira en 8h

    const { order, reason } = await createOrderWithCapacityCheck(
      {
        customerPhone: parsedInput.customerPhone?.trim()
          ? parsedInput.customerPhone.trim()
          : parsedInput.customerName
            ? `mesero-${parsedInput.customerName.substring(0, 15)}`
            : `mesa-${parsedInput.tableNumber}`,
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        packagingUsdCents: serverSurcharges.packagingUsdCents,
        deliveryUsdCents: serverSurcharges.deliveryUsdCents,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: buildSurchargesSnapshot(serverSurcharges, parsedInput.orderMode, settings),
        status: "kitchen", // Va directo a cocina
        paymentMethod: parsedInput.paymentMethod,
        paymentProvider: "whatsapp_manual", // provider dummy; el pago es presencial
        orderMode: parsedInput.orderMode,
        tableNumber: parsedInput.orderMode === "take_away" && !parsedInput.tableNumber.trim()
          ? "Mostrador"
          : parsedInput.orderMode === "delivery" && !parsedInput.tableNumber.trim()
            ? "Domicilio"
            : parsedInput.tableNumber,
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
      orderMode: parsedInput.orderMode,
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
    const isForeignCurrency =
      parsedInput.paymentMethod === "Efectivo $" ||
      parsedInput.paymentMethod === "Zelle" ||
      parsedInput.paymentMethod === "Binance";

    const surchargeItems = snapshotItems.map((item) => ({
      categoryIsSimple: items.find((i) => i.id === item.id)?.categoryIsSimple ?? false,
      categoryName: items.find((i) => i.id === item.id)?.categoryName ?? "",
      quantity: item.quantity,
      isPrepackaged: item.isPrepackaged,
      selectedAdicionales: item.selectedAdicionales.map((a) => ({
        quantity: a.quantity,
        isPrepackaged: a.isPrepackaged,
        substitutesComponentId: a.substitutesComponentId,
      })),
      selectedBebidas: item.selectedBebidas.map((b) => ({
        quantity: b.quantity,
        isPrepackaged: b.isPrepackaged,
      })),
    }));

    const serverSurcharges = calculateSurcharges(surchargeItems, parsedInput.orderMode, {
      packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
      packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents,
      packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
      deliveryFeeUsdCents: settings.deliveryFeeUsdCents,
    });

    const igtfUsdCents =
      applyIgtf && isForeignCurrency
        ? Math.round((subtotalUsdCents + serverSurcharges.totalSurchargeUsdCents) * (igtfPercentage / 100))
        : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents + serverSurcharges.totalSurchargeUsdCents;
    const grandTotalBsCents =
      subtotalBsCents + igtfBsCents + usdCentsToBsCents(serverSurcharges.totalSurchargeUsdCents, rateResult.rate);

    const [order] = await db
      .update(orders)
      .set({
        customerPhone: parsedInput.customerName
          ? `mesero-${parsedInput.customerName.substring(0, 15)}`
          : `mesa-${parsedInput.tableNumber}`,
        itemsSnapshot: snapshotItems,
        packagingUsdCents: serverSurcharges.packagingUsdCents,
        deliveryUsdCents: serverSurcharges.deliveryUsdCents,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: buildSurchargesSnapshot(serverSurcharges, parsedInput.orderMode, settings),
        paymentMethod: parsedInput.paymentMethod,
        orderMode: parsedInput.orderMode,
        tableNumber: parsedInput.orderMode === "take_away" && !parsedInput.tableNumber.trim()
          ? "Mostrador"
          : parsedInput.orderMode === "delivery" && !parsedInput.tableNumber.trim()
            ? "Domicilio"
            : parsedInput.tableNumber,
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
      orderMode: parsedInput.orderMode,
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
