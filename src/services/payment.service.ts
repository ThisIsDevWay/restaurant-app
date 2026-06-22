import { expirePendingOrders, getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider, getProviderById } from "@/lib/payment-providers";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Convierte un string decimal ("150.75" o "150,00") a centavos enteros sin usar floats.
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
      createdAt: orders.createdAt,
      expiresAt: orders.expiresAt,
      customerPhone: orders.customerPhone,
    })
    .from(orders)
    .where(
      and(
        eq(orders.paymentProvider, "pabilo_notifications"),
        eq(orders.status, "pending"),
        gt(orders.expiresAt, new Date()),
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

    // 3. Conciliar por referencia parcial + monto exacto
    let matched = 0;
    for (const notif of notifications) {
      if (notif.status !== "CONFIRMED") continue;

      const notifRef = String(notif.reference ?? "").trim();
      if (!notifRef) continue;

      const notifAmountBsCents = parseDecimalStringToCents(notif.amount);

      const matchedOrder = pendingOrders.find((o) => {
        if (!o.paymentReference) return false;
        const clientRef = o.paymentReference.trim();
        return notifRef.endsWith(clientRef) && o.grandTotalBsCents === notifAmountBsCents;
      });

      if (matchedOrder) {
        // Transaction to update status and add paymentsLog
        await db.transaction(async (tx) => {
          // Verify reference is not already used in paymentsLog
          const [existingLog] = await tx
            .select()
            .from(paymentsLog)
            .where(eq(paymentsLog.reference, notifRef))
            .for("update")
            .limit(1);

          if (existingLog) return;

          await tx
            .update(orders)
            .set({
              status: "paid",
              paymentReference: notifRef,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, matchedOrder.id));

          await tx.insert(paymentsLog).values({
            orderId: matchedOrder.id,
            providerId: "pabilo_notifications",
            amountBsCents: matchedOrder.grandTotalBsCents,
            reference: notifRef,
            senderPhone: notif.from || matchedOrder.customerPhone,
            providerRaw: notif,
            outcome: "confirmed",
          });
        });

        matched++;
        // Remove from list to avoid double matching
        pendingOrders.splice(pendingOrders.indexOf(matchedOrder), 1);
      }
    }

    return { matched, checked: pendingOrders.length };
  } catch (err: any) {
    logger.error("Error in reconcilePabiloNotifications cron service", { error: err.message });
    return { matched: 0, checked: pendingOrders.length };
  }
}
