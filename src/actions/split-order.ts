"use server";
import * as v from "valibot";
import { randomUUID } from "node:crypto";
import { authenticatedActionClient } from "@/lib/safe-action";
import { calculateOrderTotals } from "@/services/order.service";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { createOrderWithCapacityCheck } from "@/db/queries/orders";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { printAllTickets } from "@/lib/print/enqueue";
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

// ───────────────────────────────────────────────────────────────────────────
// Feature A — Dividir la cuenta de una orden de mesa existente (split bill).
// Parte el `itemsSnapshot` ya congelado de la orden madre en N sub-pedidos
// cobrables por separado. NO recalcula precios contra el menú (evita fallos por
// 86/cambios de precio): reparte los montos guardados. La madre queda
// `cancelled` y desaparece de las listas (getKitchenOrdersSimple excluye cancelled).
// El cobro posterior de cada hijo usa el flujo existente (settleOrderAction).
// ───────────────────────────────────────────────────────────────────────────

const splitOrderSchema = v.object({
  parentOrderId: v.pipe(v.string(), v.uuid()),
  splits: v.pipe(
    v.array(
      v.object({
        label: v.optional(v.string()),
        lines: v.pipe(
          v.array(
            v.object({
              index: v.pipe(v.number(), v.integer(), v.minValue(0)),
              quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
            }),
          ),
          v.minLength(1),
        ),
      }),
    ),
    v.minLength(2, "Debe dividir en al menos 2 sub-cuentas"),
  ),
});

export const splitOrderAction = authenticatedActionClient
  .schema(splitOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "cashier"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const splitGroupId = randomUUID();

    const result = await db.transaction(async (tx) => {
      // Serializar por orden para que un doble-submit no genere duplicados.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('orders_split'), hashtext(${parsedInput.parentOrderId}))`,
      );

      const [parent] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, parsedInput.parentOrderId))
        .limit(1);

      if (!parent) throw new Error("Pedido no encontrado");
      if (parent.paidAt) throw new Error("El pedido ya fue cobrado.");
      if (parent.status === "cancelled")
        throw new Error("El pedido ya no está activo.");
      if (parent.paymentMetadata?.splitInto)
        throw new Error("El pedido ya fue dividido.");
      if (!["pending", "kitchen"].includes(parent.status))
        throw new Error("El pedido no se puede dividir en su estado actual.");

      const snapshot = parent.itemsSnapshot;

      // Validar partición exacta: cada unidad de cada línea asignada una sola vez.
      const assignedPerLine = new Array(snapshot.length).fill(0);
      for (const split of parsedInput.splits) {
        for (const line of split.lines) {
          if (line.index >= snapshot.length)
            throw new Error("Línea inválida en la división.");
          assignedPerLine[line.index] += line.quantity;
        }
      }
      for (let i = 0; i < snapshot.length; i++) {
        if (assignedPerLine[i] !== snapshot[i].quantity) {
          throw new Error(
            `La división debe repartir exactamente las cantidades (revisa "${snapshot[i].name}").`,
          );
        }
      }

      const nSplits = parsedInput.splits.length;
      const childIds: string[] = [];
      const childNumbers: number[] = [];

      const rate = Number(parent.rateSnapshotBsPerUsd);

      // Reconciliación: la suma de los hijos debe cuadrar exacto con la madre,
      // tanto en subtotal como en recargos (empaque/delivery). El IGTF se queda
      // en 0: se recalcula al cobrar cada hijo según su método de pago.
      let bsAllocated = 0;
      let usdAllocated = 0;
      let packagingAllocated = 0;
      let deliveryAllocated = 0;

      for (let s = 0; s < nSplits; s++) {
        const split = parsedInput.splits[s];
        const isLast = s === nSplits - 1;

        // Clonar las líneas con la cantidad asignada y el Bs amortizado por unidad.
        const childLines = split.lines.map((line) => {
          const src = snapshot[line.index];
          const portionBs = Math.round(
            (src.itemTotalBsCents * line.quantity) / src.quantity,
          );
          return { ...src, quantity: line.quantity, itemTotalBsCents: portionBs };
        });

        let childBs = childLines.reduce((sum, l) => sum + l.itemTotalBsCents, 0);
        // USD del hijo = proporción del subtotal USD de la madre según su parte en Bs.
        let childUsd =
          parent.subtotalBsCents > 0
            ? Math.round(
                (parent.subtotalUsdCents * childBs) / parent.subtotalBsCents,
              )
            : 0;

        // Recargos repartidos proporcionalmente al subtotal de cada hijo.
        const fraction =
          parent.subtotalBsCents > 0 ? childBs / parent.subtotalBsCents : 0;
        let childPackagingUsd = Math.round(parent.packagingUsdCents * fraction);
        let childDeliveryUsd = Math.round(parent.deliveryUsdCents * fraction);

        if (isLast) {
          // El último hijo absorbe el residuo de redondeo para cuadrar exacto.
          childBs = parent.subtotalBsCents - bsAllocated;
          childUsd = parent.subtotalUsdCents - usdAllocated;
          childPackagingUsd = parent.packagingUsdCents - packagingAllocated;
          childDeliveryUsd = parent.deliveryUsdCents - deliveryAllocated;
          const linesBs = childLines.reduce(
            (sum, l) => sum + l.itemTotalBsCents,
            0,
          );
          if (childLines.length > 0) {
            childLines[childLines.length - 1].itemTotalBsCents += childBs - linesBs;
          }
        }
        bsAllocated += childBs;
        usdAllocated += childUsd;
        packagingAllocated += childPackagingUsd;
        deliveryAllocated += childDeliveryUsd;

        const surchargesUsd = childPackagingUsd + childDeliveryUsd;
        const childGrandUsd = childUsd + surchargesUsd;
        const childGrandBs =
          childBs + (surchargesUsd > 0 ? usdCentsToBsCents(surchargesUsd, rate) : 0);

        const [child] = await tx
          .insert(orders)
          .values({
            customerPhone: parent.customerPhone,
            itemsSnapshot: childLines,
            subtotalUsdCents: childUsd,
            subtotalBsCents: childBs,
            packagingUsdCents: childPackagingUsd,
            deliveryUsdCents: childDeliveryUsd,
            igtfUsdCents: 0,
            igtfBsCents: 0,
            grandTotalUsdCents: childGrandUsd,
            grandTotalBsCents: childGrandBs,
            // Conserva la forma del snapshot de la madre, ajustando los recargos
            // a la parte de este hijo (es solo auditoría; el cobro usa columnas).
            surchargesSnapshot: parent.surchargesSnapshot
              ? {
                  ...parent.surchargesSnapshot,
                  packagingUsdCents: childPackagingUsd,
                  deliveryUsdCents: childDeliveryUsd,
                }
              : null,
            status: parent.status,
            paymentMethod: parent.paymentMethod,
            paymentProvider: "whatsapp_manual",
            paymentReference: null,
            paidAt: null,
            createdByRole: ctx.user.role as "admin" | "waiter" | "cashier",
            orderMode: parent.orderMode,
            tableNumber: parent.tableNumber,
            customerName: split.label?.trim() || parent.customerName || null,
            deliveryAddress: parent.deliveryAddress,
            gpsCoords: parent.gpsCoords,
            exchangeRateId: parent.exchangeRateId,
            rateSnapshotBsPerUsd: parent.rateSnapshotBsPerUsd,
            expiresAt: parent.expiresAt,
            checkoutToken: null,
            paymentMetadata: {
              parentOrderId: parent.id,
              splitGroupId,
              splitIndex: s + 1,
              splitCount: nSplits,
              isSubOrder: true,
            },
          })
          .returning();

        if (!child) throw new Error("Error al crear el sub-pedido");
        childIds.push(child.id);
        childNumbers.push(child.orderNumber);
      }

      // Cancelar la madre y dejar rastro de los hijos.
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          paymentMetadata: {
            ...(parent.paymentMetadata ?? {}),
            splitInto: childIds,
            splitGroupId,
            splitAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, parent.id));

      return { childIds, childNumbers };
    });

    // No se imprimen comandas de producción: la comida ya fue enviada a cocina
    // por la orden madre. Cada hijo imprime su recibo al cobrarse (settleOrderAction).

    revalidatePath("/caja");
    revalidatePath("/waiter");
    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return {
      success: true,
      splitGroupId,
      childOrderIds: result.childIds,
      childOrderNumbers: result.childNumbers,
    };
  });

// ───────────────────────────────────────────────────────────────────────────
// Feature B — Pedido multi-modalidad creado en caja.
// Un solo comensal arma un carrito y lo reparte en varios destinos, cada uno
// con su propia modalidad (aquí / para llevar / delivery), dirección y método
// de pago. Se crea UNA orden por destino, recalculando recargos según el modo,
// y se cobra al crear (chargeNow). Las órdenes quedan vinculadas por splitGroupId.
// ───────────────────────────────────────────────────────────────────────────

const multiModeOrderSchema = v.object({
  customerPhone: v.optional(v.string()),
  customerName: v.optional(v.string()),
  destinations: v.pipe(
    v.array(
      v.object({
        orderMode: v.picklist(["on_site", "take_away", "delivery"]),
        tableNumber: v.optional(v.string()),
        deliveryAddress: v.optional(v.string()),
        deliveryZoneLabel: v.optional(v.string()),
        customerName: v.optional(v.string()),
        customerPhone: v.optional(v.string()),
        paymentMethod: v.picklist(WAITER_PAYMENT_METHODS),
        paymentReference: v.optional(v.string()),
        items: v.any(), // CheckoutItem[] — validado en el service
      }),
    ),
    v.minLength(2, "Debe repartir en al menos 2 destinos"),
  ),
});

export const createMultiModeOrderAction = authenticatedActionClient
  .schema(multiModeOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "cashier"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");

    const rateResult = await getActiveRate();
    if (!rateResult) throw new Error("Tasa de cambio no disponible");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
    }).format(new Date());

    const rate = rateResult.rate;
    const applyIgtf = settings.applyIgtf;
    const igtfPercentage = Number(settings.igtfPercentage) || 3;
    const deliveryZones = (settings.deliveryZones ?? []) as Array<{
      label: string;
      feeUsdCents: number;
    }>;
    const splitGroupId = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // ── Fase 1: validar + calcular financieros de TODOS los destinos antes de
    // insertar nada, para minimizar creaciones parciales si algo falla. ──
    const prepared = parsedInput.destinations.map((dest, idx) => {
      const items = dest.items as CheckoutItem[];
      if (!items || items.length === 0)
        throw new Error(`El destino ${idx + 1} no tiene ítems.`);

      const isCash =
        dest.paymentMethod === "Efectivo $" || dest.paymentMethod === "Efectivo Bs";
      const reference = dest.paymentReference?.trim() ?? "";
      if (!isCash && !reference)
        throw new Error(
          `La referencia de pago es obligatoria para el destino ${idx + 1} (${dest.paymentMethod}).`,
        );
      if (dest.orderMode === "delivery" && !dest.deliveryAddress?.trim())
        throw new Error(`El destino ${idx + 1} (delivery) requiere dirección.`);

      return { dest, items, reference, idx };
    });

    // Calcular totales por destino (valida disponibilidad/precios contra el menú).
    // Nota: la disponibilidad se valida por destino; si el mismo ítem va a varios
    // destinos podría sobre-venderse (control suave de inventario diario).
    const computed: Array<{ idx: number; insert: typeof orders.$inferInsert }> = [];
    for (const { dest, items, reference, idx } of prepared) {
      const { snapshotItems, subtotalUsdCents, subtotalBsCents } =
        await calculateOrderTotals(items, rate, today);

      const surchargeItems = snapshotItems.map((item) => ({
        categoryIsSimple:
          items.find((i) => i.id === item.id)?.categoryIsSimple ?? false,
        categoryName: items.find((i) => i.id === item.id)?.categoryName ?? "",
        quantity: item.quantity,
        isPrepackaged: item.isPrepackaged,
        selectedAdicionales: item.selectedAdicionales.map((a) => ({
          quantity: a.quantity,
          isPrepackaged: a.isPrepackaged,
          substitutesComponentId: a.substitutesComponentId,
        })),
        selectedBebidas: (item.selectedBebidas ?? []).map((b) => ({
          quantity: b.quantity,
          isPrepackaged: b.isPrepackaged,
        })),
      }));

      const selectedZone =
        dest.orderMode === "delivery"
          ? deliveryZones.find((z) => z.label === dest.deliveryZoneLabel)
          : undefined;
      const surchargeSettings = {
        packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
        packagingFeePerAdicionalUsdCents:
          settings.packagingFeePerAdicionalUsdCents,
        packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
        deliveryFeeUsdCents:
          dest.orderMode === "delivery" ? selectedZone?.feeUsdCents ?? 0 : 0,
      };

      const surcharges = calculateSurcharges(
        surchargeItems,
        dest.orderMode,
        surchargeSettings,
      );

      const isForeignCurrency =
        dest.paymentMethod === "Efectivo $" ||
        dest.paymentMethod === "Zelle" ||
        dest.paymentMethod === "Binance";

      const igtfUsdCents =
        applyIgtf && isForeignCurrency
          ? Math.round(
              (subtotalUsdCents + surcharges.totalSurchargeUsdCents) *
                (igtfPercentage / 100),
            )
          : 0;
      const igtfBsCents = Math.round(igtfUsdCents * rate);

      const grandTotalUsdCents =
        subtotalUsdCents + igtfUsdCents + surcharges.totalSurchargeUsdCents;
      const grandTotalBsCents =
        subtotalBsCents +
        igtfBsCents +
        usdCentsToBsCents(surcharges.totalSurchargeUsdCents, rate);

      const rawTable = dest.tableNumber?.trim() ?? "";
      const resolvedTableNumber = rawTable
        ? rawTable
        : dest.orderMode === "take_away"
          ? "Mostrador"
          : dest.orderMode === "delivery"
            ? "Domicilio"
            : "";

      const customerPhone =
        dest.customerPhone?.trim() ||
        parsedInput.customerPhone?.trim() ||
        (dest.customerName?.trim()
          ? `mesero-${dest.customerName.trim().substring(0, 15)}`
          : `mesa-${resolvedTableNumber}`);

      computed.push({
        idx,
        insert: {
          customerPhone,
          itemsSnapshot: snapshotItems,
          subtotalUsdCents,
          subtotalBsCents,
          packagingUsdCents: surcharges.packagingUsdCents,
          deliveryUsdCents: surcharges.deliveryUsdCents,
          igtfUsdCents,
          igtfBsCents,
          grandTotalUsdCents,
          grandTotalBsCents,
          surchargesSnapshot: buildSurchargesSnapshot(
            surcharges,
            dest.orderMode,
            surchargeSettings,
            selectedZone?.label,
          ),
          status: "kitchen" as const, // cobrar al crear → directo a cocina
          paymentMethod: dest.paymentMethod,
          paymentProvider: "whatsapp_manual" as const,
          paymentReference: reference || null,
          paidAt: new Date(),
          createdByRole: ctx.user.role as "admin" | "waiter" | "cashier",
          orderMode: dest.orderMode,
          tableNumber: resolvedTableNumber,
          customerName:
            dest.customerName?.trim() || parsedInput.customerName?.trim() || null,
          deliveryAddress: dest.deliveryAddress?.trim() || null,
          gpsCoords: null,
          exchangeRateId: settings.currentRateId!,
          rateSnapshotBsPerUsd: rate.toString(),
          expiresAt,
          checkoutToken: null,
          paymentMetadata: {
            splitGroupId,
            groupKind: "multimode",
            destinationIndex: idx + 1,
            destinationCount: parsedInput.destinations.length,
          },
        },
      });
    }

    // ── Fase 2: insertar y cobrar cada orden, imprimiendo comanda + recibo. ──
    const created: Array<{
      id: string;
      orderNumber: number;
      orderMode: string;
    }> = [];
    for (const { insert } of computed) {
      const { order } = await createOrderWithCapacityCheck(insert, 999);
      if (!order) throw new Error("Error al crear una de las órdenes");
      await printAllTickets(order, { waiterName: ctx.user.name ?? undefined });
      created.push({
        id: order.id,
        orderNumber: order.orderNumber,
        orderMode: order.orderMode ?? "on_site",
      });
    }

    revalidatePath("/caja");
    revalidatePath("/waiter");
    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    return { success: true, splitGroupId, orders: created };
  });
