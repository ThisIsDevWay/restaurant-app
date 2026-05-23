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

const WAITER_PAYMENT_METHODS = [
  "Efectivo $",
  "Efectivo Bs",
  "Pago Móvil",
  "Punto / PdV",
  "Zelle",
  "Transf.",
  "Binance",
] as const;

const waiterOrderSchema = v.object({
  tableNumber: v.optional(v.string()),
  customerName: v.optional(v.string()),
  paymentMethod: v.picklist(WAITER_PAYMENT_METHODS),
  orderMode: v.picklist(["on_site", "take_away", "delivery"]),
  customerPhone: v.optional(v.string()),
  deliveryZoneLabel: v.optional(v.string()),
  // Caja: cuando es true, la orden se crea ya cobrada (un solo paso).
  chargeNow: v.optional(v.boolean()),
  paymentReference: v.optional(v.string()),
  items: v.any(), // CheckoutItem[] — validado en service
});

const updateWaiterOrderSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  tableNumber: v.optional(v.string()),
  customerName: v.optional(v.string()),
  paymentMethod: v.picklist(WAITER_PAYMENT_METHODS),
  orderMode: v.picklist(["on_site", "take_away", "delivery"]),
  customerPhone: v.optional(v.string()),
  deliveryZoneLabel: v.optional(v.string()),
  // Caja: cuando el cobro invoca el update, no reimprime (el ticket de cobro
  // de settleOrderAction ya lleva los ítems finales).
  skipPrint: v.optional(v.boolean()),
  items: v.any(), // CheckoutItem[] — validado en service
});

const settleOrderSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  paymentMethod: v.picklist(WAITER_PAYMENT_METHODS),
  paymentReference: v.optional(v.string()),
});

export const createWaiterOrderAction = authenticatedActionClient
  .schema(waiterOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Guard: solo admin o waiter
    if (!["admin", "waiter", "cashier"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    // Caja: cobro en un solo paso al crear.
    const chargeNow = parsedInput.chargeNow === true;
    const isCash =
      parsedInput.paymentMethod === "Efectivo $" ||
      parsedInput.paymentMethod === "Efectivo Bs";
    const paymentReference = parsedInput.paymentReference?.trim() ?? "";
    if (chargeNow && !isCash && !paymentReference) {
      throw new Error("La referencia de pago es obligatoria para este método");
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

    // Resolver tarifa de delivery: en modo delivery se usa la zona elegida.
    const deliveryZones = (settings.deliveryZones ?? []) as Array<{ label: string; feeUsdCents: number }>;
    const selectedZone =
      parsedInput.orderMode === "delivery"
        ? deliveryZones.find((z) => z.label === parsedInput.deliveryZoneLabel)
        : undefined;
    const resolvedDeliveryFeeUsdCents =
      parsedInput.orderMode === "delivery" ? selectedZone?.feeUsdCents ?? 0 : 0;

    const surchargeSettings = {
      packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
      packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents,
      packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
      deliveryFeeUsdCents: resolvedDeliveryFeeUsdCents,
    };

    const serverSurcharges = calculateSurcharges(surchargeItems, parsedInput.orderMode, surchargeSettings);

    const igtfUsdCents =
      applyIgtf && isForeignCurrency
        ? Math.round((subtotalUsdCents + serverSurcharges.totalSurchargeUsdCents) * (igtfPercentage / 100))
        : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents + serverSurcharges.totalSurchargeUsdCents;
    const grandTotalBsCents =
      subtotalBsCents + igtfBsCents + usdCentsToBsCents(serverSurcharges.totalSurchargeUsdCents, rateResult.rate);

    const rawTable = parsedInput.tableNumber?.trim() ?? "";
    const resolvedTableNumber = rawTable
      ? rawTable
      : parsedInput.orderMode === "take_away"
        ? "Mostrador"
        : parsedInput.orderMode === "delivery"
          ? "Domicilio"
          : "";

    // Si la caja cobra al crear, el pedido nace pagado y va directo a cocina.
    const initialStatus = chargeNow
      ? "kitchen"
      : settings.requirePaymentBeforeKitchen
        ? "pending"
        : "kitchen";

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // expira en 8h

    const { order, reason } = await createOrderWithCapacityCheck(
      {
        customerPhone: parsedInput.customerPhone?.trim()
          ? parsedInput.customerPhone.trim()
          : parsedInput.customerName
            ? `mesero-${parsedInput.customerName.substring(0, 15)}`
            : `mesa-${resolvedTableNumber}`,
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        packagingUsdCents: serverSurcharges.packagingUsdCents,
        deliveryUsdCents: serverSurcharges.deliveryUsdCents,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: buildSurchargesSnapshot(
          serverSurcharges,
          parsedInput.orderMode,
          surchargeSettings,
          selectedZone?.label,
        ),
        status: initialStatus,
        paymentMethod: parsedInput.paymentMethod,
        paymentProvider: "whatsapp_manual", // provider dummy; el pago es presencial
        paymentReference: chargeNow ? paymentReference || null : null,
        paidAt: chargeNow ? new Date() : null,
        createdByRole: ctx.user.role as "admin" | "waiter" | "cashier",
        orderMode: parsedInput.orderMode,
        tableNumber: resolvedTableNumber,
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

    // Imprimir la comanda solo si el pedido va directo a cocina.
    // En modo "pagar antes de cocinar" la comanda se imprime al cobrar.
    if (initialStatus === "kitchen") {
      const ticketText = generateTicketText({
        orderNumber: order.orderNumber,
        tableNumber: resolvedTableNumber,
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

      const printers = settings.printerTargets && settings.printerTargets.length > 0
        ? settings.printerTargets
        : [{ name: "main", copies: 2, enabled: true }];

      const activePrinters = printers.filter(p => p.enabled && p.name.trim() !== "");

      if (activePrinters.length > 0) {
        await db.insert(printJobs).values(
          activePrinters.map(p => ({
            orderId: order.id,
            copies: p.copies,
            rawContent: ticketText,
            status: "pending" as const,
            target: p.name,
          }))
        );
      }
    }

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    revalidatePath("/waiter");
    revalidatePath("/caja");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: parsedInput.paymentMethod,
      subtotalUsdCents,
      subtotalBsCents,
      packagingUsdCents: serverSurcharges.packagingUsdCents,
      deliveryUsdCents: serverSurcharges.deliveryUsdCents,
      rateSnapshotBsPerUsd: rateResult.rate.toString(),
    };
  });

export const updateWaiterOrderAction = authenticatedActionClient
  .schema(updateWaiterOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "waiter", "cashier"].includes(ctx.user.role as string)) {
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

    const deliveryZones = (settings.deliveryZones ?? []) as Array<{ label: string; feeUsdCents: number }>;
    const selectedZone =
      parsedInput.orderMode === "delivery"
        ? deliveryZones.find((z) => z.label === parsedInput.deliveryZoneLabel)
        : undefined;
    const resolvedDeliveryFeeUsdCents =
      parsedInput.orderMode === "delivery" ? selectedZone?.feeUsdCents ?? 0 : 0;

    const surchargeSettings = {
      packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
      packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents,
      packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
      deliveryFeeUsdCents: resolvedDeliveryFeeUsdCents,
    };

    const serverSurcharges = calculateSurcharges(surchargeItems, parsedInput.orderMode, surchargeSettings);

    const igtfUsdCents =
      applyIgtf && isForeignCurrency
        ? Math.round((subtotalUsdCents + serverSurcharges.totalSurchargeUsdCents) * (igtfPercentage / 100))
        : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rateResult.rate);

    const grandTotalUsdCents = subtotalUsdCents + igtfUsdCents + serverSurcharges.totalSurchargeUsdCents;
    const grandTotalBsCents =
      subtotalBsCents + igtfBsCents + usdCentsToBsCents(serverSurcharges.totalSurchargeUsdCents, rateResult.rate);

    const rawTable = parsedInput.tableNumber?.trim() ?? "";
    const resolvedTableNumber = rawTable
      ? rawTable
      : parsedInput.orderMode === "take_away"
        ? "Mostrador"
        : parsedInput.orderMode === "delivery"
          ? "Domicilio"
          : "";

    const [order] = await db
      .update(orders)
      .set({
        customerPhone: parsedInput.customerName
          ? `mesero-${parsedInput.customerName.substring(0, 15)}`
          : `mesa-${resolvedTableNumber}`,
        itemsSnapshot: snapshotItems,
        packagingUsdCents: serverSurcharges.packagingUsdCents,
        deliveryUsdCents: serverSurcharges.deliveryUsdCents,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        surchargesSnapshot: buildSurchargesSnapshot(
          serverSurcharges,
          parsedInput.orderMode,
          surchargeSettings,
          selectedZone?.label,
        ),
        paymentMethod: parsedInput.paymentMethod,
        orderMode: parsedInput.orderMode,
        tableNumber: resolvedTableNumber,
        customerName: parsedInput.customerName || null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, parsedInput.id))
      .returning();

    if (!order) throw new Error("Error al actualizar la orden");

    // Generar e imprimir la comanda actualizada — salvo que el cobro de caja
    // lo invoque con skipPrint (el ticket de cobro ya llevará los ítems finales).
    if (!parsedInput.skipPrint) {
      const ticketText = generateTicketText({
        orderNumber: order.orderNumber,
        tableNumber: resolvedTableNumber,
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

      const printers = settings.printerTargets && settings.printerTargets.length > 0
        ? settings.printerTargets
        : [{ name: "main", copies: 2, enabled: true }];

      const activePrinters = printers.filter(p => p.enabled && p.name.trim() !== "");

      if (activePrinters.length > 0) {
        await db.insert(printJobs).values(
          activePrinters.map(p => ({
            orderId: order.id,
            copies: p.copies,
            rawContent: ticketText,
            status: "pending" as const,
            target: p.name,
          }))
        );
      }
    }

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    revalidatePath("/waiter");
    revalidatePath("/caja");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: parsedInput.paymentMethod,
      subtotalUsdCents,
      subtotalBsCents,
      packagingUsdCents: serverSurcharges.packagingUsdCents,
      deliveryUsdCents: serverSurcharges.deliveryUsdCents,
      rateSnapshotBsPerUsd: rateResult.rate.toString(),
    };
  });

/**
 * Registra el cobro de un pedido en caja: confirma el método de pago,
 * recalcula IGTF/total con el método definitivo, guarda la referencia y
 * marca el pedido como cobrado (`paidAt`). Si el pedido estaba `pending`
 * (modo "pagar antes de cocinar"), lo pasa a `paid` para que llegue a cocina.
 */
export const settleOrderAction = authenticatedActionClient
  .schema(settleOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "waiter", "cashier"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const isCash =
      parsedInput.paymentMethod === "Efectivo $" ||
      parsedInput.paymentMethod === "Efectivo Bs";
    const reference = parsedInput.paymentReference?.trim() ?? "";
    if (!isCash && !reference) {
      throw new Error("La referencia de pago es obligatoria para este método");
    }

    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");

    const [current] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parsedInput.id))
      .limit(1);
    if (!current) throw new Error("Pedido no encontrado");
    if (current.paidAt) throw new Error("El pedido ya fue cobrado");

    const applyIgtf = settings.applyIgtf;
    const igtfPercentage = Number(settings.igtfPercentage) || 3;
    const isForeignCurrency =
      parsedInput.paymentMethod === "Efectivo $" ||
      parsedInput.paymentMethod === "Zelle" ||
      parsedInput.paymentMethod === "Binance";

    const rate = Number(current.rateSnapshotBsPerUsd);
    const baseUsdCents =
      current.subtotalUsdCents + current.packagingUsdCents + current.deliveryUsdCents;

    const igtfUsdCents =
      applyIgtf && isForeignCurrency
        ? Math.round(baseUsdCents * (igtfPercentage / 100))
        : 0;
    const igtfBsCents = Math.round(igtfUsdCents * rate);

    const grandTotalUsdCents = baseUsdCents + igtfUsdCents;
    const grandTotalBsCents =
      current.subtotalBsCents +
      usdCentsToBsCents(current.packagingUsdCents + current.deliveryUsdCents, rate) +
      igtfBsCents;

    const nextStatus = current.status === "pending" ? "paid" : current.status;

    const [order] = await db
      .update(orders)
      .set({
        paymentMethod: parsedInput.paymentMethod,
        paymentReference: reference || null,
        igtfUsdCents,
        igtfBsCents,
        grandTotalUsdCents,
        grandTotalBsCents,
        status: nextStatus,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, parsedInput.id))
      .returning();

    if (!order) throw new Error("Error al registrar el cobro");

    // Comprobante de cobro. Si el pedido estaba pendiente (modo pagar-antes),
    // este ticket también funciona como comanda para cocina.
    const ticketText = generateTicketText({
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber ?? "",
      customerName: order.customerName ?? undefined,
      items: order.itemsSnapshot ?? [],
      totalBsCents: grandTotalBsCents,
      totalUsdCents: grandTotalUsdCents,
      igtfBsCents,
      igtfUsdCents,
      date: formatOrderDate(new Date()),
      paymentMethod: parsedInput.paymentMethod,
      waiterName: ctx.user.name ?? undefined,
      orderMode: order.orderMode ?? undefined,
      restaurantName: settings.restaurantName,
    });

    const printers = settings.printerTargets && settings.printerTargets.length > 0
      ? settings.printerTargets
      : [{ name: "main", copies: 2, enabled: true }];

    const activePrinters = printers.filter(p => p.enabled && p.name.trim() !== "");

    if (activePrinters.length > 0) {
      await db.insert(printJobs).values(
        activePrinters.map(p => ({
          orderId: order.id,
          copies: p.copies,
          rawContent: ticketText,
          status: "pending" as const,
          target: p.name,
        }))
      );
    }

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    revalidatePath("/waiter");
    revalidatePath("/caja");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  });
