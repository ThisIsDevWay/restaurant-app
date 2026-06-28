import { expirePendingOrders, getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider, getProviderById } from "@/lib/payment-providers";
import { db } from "@/db";
import { orders, paymentsLog, bankNotifications } from "@/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import * as Sentry from "@sentry/nextjs";
import { printReceipt } from "@/lib/print/enqueue";
import { getReferenceSuffix } from "@/lib/reconciliation-rules";

/**
 * Convierte un string decimal simple ("150.75" o "150,00") a centavos enteros sin usar floats.
 * 
 * NOTA DE COEXISTENCIA: Esta función está diseñada para procesar montos limpios provenientes de
 * APIs estructuradas (como Pabilo), que no contienen separadores de miles y tienen un único divisor decimal.
 * Para procesar cadenas con formatos complejos procedentes de textos crudos de SMS bancarios (que pueden tener
 * múltiples puntos o comas de miles y decimales arbitrarios), use `parseBankSmsToCents`.
 */
export function parseDecimalStringToCents(amountStr: string): number {
  const parts = amountStr.trim().split(/[.,]/);
  const units = parseInt(parts[0], 10) || 0;
  let fractionStr = parts[1] || "";
  if (fractionStr.length > 2) {
    fractionStr = fractionStr.slice(0, 2);
  } else {
    fractionStr = fractionStr.padEnd(2, "0");
  }
  const fraction = parseInt(fractionStr, 10) || 0;
  return units * 100 + fraction;
}

export async function confirmPayment(
  orderId: string,
  reference: string,
  provider?: ReturnType<typeof getActiveProvider>,
) {
  const settings = await getSettings();
  if (!settings) throw new Error("Configuración no encontrada");

  if (!provider) {
    const order = await getOrderById(orderId);
    if (!order) throw new Error("Orden no encontrada");
    provider = getProviderById(order.paymentProvider, settings);
  }

  if (provider.mode !== "active") {
    throw new Error("Este provider no acepta confirmaciones manuales");
  }

  return provider.confirmPayment({
    type: "reference",
    reference,
    orderId,
  });
}

export async function processWebhookPayload(
  payload: string,
  provider?: ReturnType<typeof getActiveProvider>,
  signature?: string,
) {
  if (!provider) {
    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");
    provider = getActiveProvider(settings);
  }

  if (provider.mode !== "passive") {
    return { success: false, reason: "ignored", message: "Provider is not passive" };
  }

  return provider.confirmPayment({
    type: "webhook_c2p",
    rawBody: payload,
    signature: signature ?? "",
  });
}

export async function expireUnpaidOrders() {
  return expirePendingOrders();
}

/**
 * Concilia automáticamente las órdenes pendientes que usen el método de
 * notificaciones de Pabilo en segundo plano.
 *
 * Cuenta con un guard de costo-cero para evitar peticiones externas si no hay trabajo.
 */
export async function reconcilePabiloNotifications(): Promise<{
  matched: number;
  checked: number;
}> {
  const settings = await getSettings();
  if (!settings) return { matched: 0, checked: 0 };

  // 1. Guard de costo-cero: buscar si hay órdenes pendientes con pabilo_notifications
  const pendingOrders = await db
    .select({
      id: orders.id,
      grandTotalBsCents: orders.grandTotalBsCents,
      paymentReference: orders.paymentReference,
    })
    .from(orders)
    .where(
      and(
        eq(orders.paymentProvider, "pabilo_notifications"),
        eq(orders.status, "pending"),
        gt(orders.expiresAt, new Date(Date.now() - 10 * 60 * 1000)),
      )
    );

  if (pendingOrders.length === 0) {
    return { matched: 0, checked: 0 };
  }

  // 2. Consultar notificaciones en Pabilo
  const apiKey = settings.pabiloApiKey || process.env.PABILO_API_KEY;
  if (!apiKey) {
    logger.warn("Pabilo API key is not configured, skipping reconciliation");
    return { matched: 0, checked: pendingOrders.length };
  }

  try {
    const res = await fetch(
      "https://api.pabilo.app/v1/bank-pay-notifications?page=1&limit=50",
      {
        headers: {
          appKey: apiKey,
        },
      }
    );

    if (!res.ok) {
      logger.error("Pabilo notifications endpoint returned error status during cron", { status: res.status });
      return { matched: 0, checked: pendingOrders.length };
    }

    const { notifications } = await res.json();

    // Get all existing references in bankNotifications (limited to 48 hours for performance)
    const existingNotifs = await db
      .select({ reference: bankNotifications.reference })
      .from(bankNotifications)
      .where(gt(bankNotifications.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)));

    // Map and insert, avoiding duplicates using suffix-4 comparison
    const notificationsToInsert = notifications
      .filter((notif: any) => notif.status === "CONFIRMED" && notif.reference)
      .map((notif: any) => ({
        source: "pabilo" as const,
        sender: "pabilo",
        message: notif.message || `Pago recibido de ${notif.from || "desconocido"} por ${notif.amount} Bs. Ref: ${notif.reference}`,
        amountRaw: notif.amount,
        amountBsCents: parseDecimalStringToCents(notif.amount),
        reference: String(notif.reference).trim(),
        senderPhone: notif.from || null,
        rawPayload: notif,
        status: "pending" as const,
      }))
      .filter((newNotif: any) => {
        const newRef = newNotif.reference;
        const duplicate = existingNotifs.some(
          (existing) => getReferenceSuffix(existing.reference) === getReferenceSuffix(newRef)
        );
        return !duplicate;
      });

    if (notificationsToInsert.length > 0) {
      await db.insert(bankNotifications).values(notificationsToInsert).onConflictDoNothing();
    }

    // 3. Ejecutar pipeline de conciliación unificado
    return runReconciliationPipeline("pabilo_notifications");
  } catch (err: any) {
    logger.error("Error in reconcilePabiloNotifications cron service", { error: err.message });
    return { matched: 0, checked: pendingOrders.length };
  }
}

/**
 * Convierte montos con formatos complejos y ruidosos típicos de SMS bancarios venezolanos a centavos enteros.
 * Maneja formatos como "3.829,36", "3,829.36", "3.829.36", "1.500" o "150".
 * 
 * NOTA DE COEXISTENCIA: Esta función es locale-agnostic y deduce los decimales basándose en el separador
 * más a la derecha. Está diseñada específicamente para texto de notificaciones bancarias crudas que contienen
 * ruido de formato y separadores de miles arbitrarios. Para strings decimales limpios de APIs estructuradas
 * sin separadores de miles, use `parseDecimalStringToCents`.
 */
export function parseBankSmsToCents(amountStr: string): number {
  let clean = amountStr.trim().replace(/[^\d.,]/g, "");
  if (!clean) return 0;

  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  const lastSeparatorIndex = Math.max(lastComma, lastDot);

  if (lastSeparatorIndex !== -1) {
    const decimalsPart = clean.slice(lastSeparatorIndex + 1);
    if (decimalsPart.length === 2) {
      const unitsPart = clean.slice(0, lastSeparatorIndex).replace(/[.,]/g, "");
      const units = parseInt(unitsPart, 10) || 0;
      const fraction = parseInt(decimalsPart, 10) || 0;
      return units * 100 + fraction;
    }
    if (decimalsPart.length === 1) {
      const unitsPart = clean.slice(0, lastSeparatorIndex).replace(/[.,]/g, "");
      const units = parseInt(unitsPart, 10) || 0;
      const fraction = parseInt(decimalsPart + "0", 10) || 0;
      return units * 100 + fraction;
    }
  }

  const unitsOnly = clean.replace(/[.,]/g, "");
  const units = parseInt(unitsOnly, 10) || 0;
  return units * 100;
}

export async function reconcileOrderWithNotification(
  tx: any,
  orderId: string,
  notificationId: string,
  cleanRef: string,
  amountBsCents: number,
  rawPayload: any,
  senderPhone?: string,
) {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .for("update")
    .limit(1);

  if (!order) {
    throw new Error("order_not_found");
  }

  if (order.status !== "pending") {
    throw new Error("order_already_processed");
  }

  // B1: Lock bankNotifications for update and verify status
  const [notif] = await tx
    .select()
    .from(bankNotifications)
    .where(eq(bankNotifications.id, notificationId))
    .for("update")
    .limit(1);

  if (!notif) {
    throw new Error("notification_not_found");
  }

  if (notif.status !== "pending") {
    throw new Error("notification_already_reconciled");
  }

  // 2. Re-validación del monto dentro de la transacción (m6 / M2 fuera de alcance)
  if (notif.amountBsCents !== order.grandTotalBsCents) {
    throw new Error("amount_mismatch");
  }

  const [existingLog] = await tx
    .select()
    .from(paymentsLog)
    .where(eq(paymentsLog.reference, cleanRef))
    .for("update")
    .limit(1);

  if (existingLog) {
    throw new Error("reference_already_used");
  }

  const updatedOrders = await tx
    .update(orders)
    .set({
      status: "paid",
      paymentReference: cleanRef,
      paidAt: new Date(),
      updatedAt: new Date(),
      paymentMetadata: sql`coalesce(payment_metadata, '{}'::jsonb) || '{"outcome": "confirmed"}'::jsonb`,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning();

  if (updatedOrders.length !== 1) {
    throw new Error("atomic_update_failed");
  }

  await tx.insert(paymentsLog).values({
    orderId,
    providerId: order.paymentProvider,
    amountBsCents,
    reference: cleanRef,
    senderPhone: senderPhone || null,
    providerRaw: rawPayload,
    outcome: "confirmed",
  });

  // 3. UPDATE condicional atómico sobre bank_notifications (B1)
  const updatedNotifs = await tx
    .update(bankNotifications)
    .set({
      status: "reconciled",
      orderId,
      updatedAt: new Date(),
    })
    .where(and(eq(bankNotifications.id, notificationId), eq(bankNotifications.status, "pending")))
    .returning();
    
  if (updatedNotifs.length !== 1) {
    throw new Error("notification_already_reconciled");
  }
    
  return order;
}

export async function notifyPaymentConfirmed(order: any) {
  const settings = await getSettings();
  if (!settings) return;

  const snapshotItems = order.itemsSnapshot as SnapshotItem[];
  const surchargesSnapshot = order.surchargesSnapshot as any;
  const rate = parseFloat(order.rateSnapshotBsPerUsd);

  await sendOrderMessage({
    templateKey: "paid",
    phone: order.customerPhone,
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    orderNumber: String(order.orderNumber),
    customerName: null,
    items: snapshotItems,
    grandTotalBsCents: order.grandTotalBsCents,
    surcharges: surchargesSnapshot
      ? {
          packagingUsdCents: surchargesSnapshot.packagingUsdCents,
          deliveryUsdCents: surchargesSnapshot.deliveryUsdCents,
          rate,
          orderMode: surchargesSnapshot.orderMode,
        }
      : undefined,
    baseUrl: settings.whatsappMicroserviceUrl,
  }).catch((err) => {
    logger.error("WhatsApp Error en notifyPaymentConfirmed", { error: String(err), orderId: order.id });
  });
}

export async function reconcileSingleOrder(orderId: string, cleanRef: string): Promise<boolean> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== "pending") return false;

  const matchedNotifs = await db
    .select()
    .from(bankNotifications)
    .where(eq(bankNotifications.status, "pending"));

  // A1: Comparar exclusivamente por sufijo de 4 dígitos
  const matches = matchedNotifs.filter((n) => getReferenceSuffix(n.reference) === getReferenceSuffix(cleanRef));
  
  if (matches.length === 0) return false;

  // A1: Guardia de ambigüedad (aborta si hay más de 1 coincidencia con el mismo sufijo)
  if (matches.length > 1) {
    logger.warn("Ambigüedad en verificación manual — requiere revisión humana", { orderId, cleanRef });
    Sentry.captureMessage(
      `Ambigüedad en verificación manual para la orden ${orderId}: Múltiples notificaciones de Pago Móvil terminan en "${getReferenceSuffix(cleanRef)}"`,
      "warning"
    );
    return false;
  }

  const targetNotif = matches[0];
  
  // Re-validación estricta de monto (M2 fuera de alcance)
  if (targetNotif.amountBsCents !== order.grandTotalBsCents) {
    return false;
  }

  try {
    const updatedOrder = await db.transaction(async (tx) => {
      return reconcileOrderWithNotification(
        tx,
        order.id,
        targetNotif.id,
        targetNotif.reference,
        order.grandTotalBsCents,
        targetNotif.rawPayload,
        targetNotif.senderPhone || order.customerPhone
      );
    });

    // m5: WhatsApp confirm sent in reconcileSingleOrder (paridad con pipeline)
    await notifyPaymentConfirmed(updatedOrder);
    await printReceipt(updatedOrder).catch((err) => {
      logger.error("Print error (recibo reconcileSingleOrder)", { error: String(err), orderId: updatedOrder.id });
    });
    return true;
  } catch (err: any) {
    if (
      err.message !== "order_already_processed" &&
      err.message !== "reference_already_used" &&
      err.message !== "notification_already_reconciled"
    ) {
      logger.error("Error al conciliar orden simple", { orderId, error: err.message });
    }
    return false;
  }
}

export async function runReconciliationPipeline(providerFilter: "pabilo_notifications" | "local_notifications"): Promise<{
  matched: number;
  checked: number;
}> {
  const pendingOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.paymentProvider, providerFilter),
        eq(orders.status, "pending"),
        gt(orders.expiresAt, new Date(Date.now() - 10 * 60 * 1000))
      )
    );

  if (pendingOrders.length === 0) return { matched: 0, checked: 0 };

  const pendingNotifs = await db
    .select()
    .from(bankNotifications)
    .where(eq(bankNotifications.status, "pending"));

  let matched = 0;

  for (const order of pendingOrders) {
    const matches = pendingNotifs.filter((n) => {
      if (order.paymentReference) {
        const clientRef = order.paymentReference.trim();
        // A1: Comparación exacta del sufijo de 4 dígitos
        return getReferenceSuffix(n.reference) === getReferenceSuffix(clientRef);
      }
      // M3: Remoción del fallback por teléfono
      return false;
    });

    if (matches.length === 0) continue;

    // A1: Guardia de ambigüedad (aborta si hay más de 1 coincidencia con el mismo sufijo sin importar el monto)
    if (matches.length > 1) {
      const msg = `Colisión en pipeline: Múltiples notificaciones de pago coinciden con el sufijo de la orden ${order.id}. Requiere atención humana.`;
      logger.warn(msg, { orderId: order.id });
      Sentry.captureMessage(msg, "warning");
      continue;
    }

    const targetNotif = matches[0];
    let isAmountOk = targetNotif.amountBsCents === order.grandTotalBsCents;

    if (!isAmountOk && targetNotif.amountRaw) {
      const altCents = parseBankSmsToCents(targetNotif.amountRaw);
      if (altCents === order.grandTotalBsCents) {
        isAmountOk = true;
        targetNotif.amountBsCents = altCents;
        
        logger.warn("Capa 3 activada: Monto recalculado con éxito", { raw: targetNotif.amountRaw, cents: altCents });
        
        await db
          .update(bankNotifications)
          .set({ amountBsCents: altCents })
          .where(eq(bankNotifications.id, targetNotif.id));
      }
    }

    if (isAmountOk) {
      try {
        const updatedOrder = await db.transaction(async (tx) => {
          return reconcileOrderWithNotification(
            tx,
            order.id,
            targetNotif.id,
            targetNotif.reference,
            order.grandTotalBsCents,
            targetNotif.rawPayload,
            targetNotif.senderPhone || order.customerPhone
          );
        });

        await notifyPaymentConfirmed(updatedOrder);
        await printReceipt(updatedOrder).catch((err) => {
          logger.error("Print error (recibo runReconciliationPipeline)", { error: String(err), orderId: updatedOrder.id });
        });
        matched++;
        pendingNotifs.splice(pendingNotifs.indexOf(targetNotif), 1);
      } catch (err: any) {
        if (
          err.message !== "order_already_processed" &&
          err.message !== "reference_already_used" &&
          err.message !== "notification_already_reconciled"
        ) {
          logger.error("Error en ejecución de transacción de conciliación", { error: err.message });
          Sentry.captureException(err);
        }
      }
    }
  }

  return { matched, checked: pendingOrders.length };
}
