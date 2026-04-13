import type {
  PaymentProvider,
  PaymentInitResult,
  PaymentConfirmInput,
  PaymentConfirmResult,
  SettingsRow,
  OrderRow,
} from "./types";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { buildOrderMessage, type SurchargesInfo } from "@/lib/whatsapp/messages";

export class WhatsAppManualProvider implements PaymentProvider {
  readonly id = "whatsapp_manual" as const;
  readonly mode = "active" as const;

  constructor(_settings: SettingsRow) { }

  async initiatePayment(
    order: OrderRow,
    settings: SettingsRow,
  ): Promise<PaymentInitResult> {
    const snapshot = order.itemsSnapshot as SnapshotItem[];
    const rate = parseFloat(order.rateSnapshotBsPerUsd);

    // Build surcharges info from the order's persisted snapshot
    const surchargesSnapshot = order.surchargesSnapshot as {
      packagingUsdCents: number;
      deliveryUsdCents: number;
      orderMode: string;
    } | null;

    const surcharges: SurchargesInfo | undefined = surchargesSnapshot
      ? {
        packagingUsdCents: surchargesSnapshot.packagingUsdCents,
        deliveryUsdCents: surchargesSnapshot.deliveryUsdCents,
        rate,
        orderMode: surchargesSnapshot.orderMode,
      }
      : undefined;

    // Use the unified template system — single source of truth
    const message = await buildOrderMessage({
      templateKey: "checkout_manual",
      phone: order.customerPhone,
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      orderNumber: String(order.orderNumber),
      customerName: null, // Not available at this point
      items: snapshot,
      grandTotalBsCents: order.grandTotalBsCents,
      surcharges,
      restaurantName: settings.restaurantName ?? undefined,
    });

    // Fallback message if template is inactive or missing
    const finalMessage = message ?? [
      `🍔 *Nuevo pedido ${settings.restaurantName ?? ""}*`,
      ``,
      `📋 Pedido #${order.orderNumber}`,
      `📱 Teléfono: ${order.customerPhone}`,
      ``,
      `¿Cómo deseas pagar?`,
    ].join("\n");

    const originalNumber = settings.whatsappNumber || "584140000000";
    const sanitizedNumber = originalNumber.replace(/\D/g, "");
    const international = sanitizedNumber.startsWith("0") ? "58" + sanitizedNumber.slice(1) : sanitizedNumber;
    const waLink = `https://wa.me/${international}?text=${encodeURIComponent(finalMessage)}`;

    return {
      screen: "whatsapp",
      waLink,
      prefilledMessage: finalMessage,
    };
  }

  async confirmPayment(
    input: PaymentConfirmInput,
  ): Promise<PaymentConfirmResult> {
    if (input.type !== "manual") {
      return {
        success: false,
        reason: "invalid_reference",
        message: "WhatsApp solo acepta confirmación manual por admin",
      };
    }

    const { adminUserId, orderId } = input;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return {
        success: false,
        reason: "invalid_reference",
        message: "Orden no encontrada",
      };
    }

    if (order.status !== "whatsapp" && order.status !== "pending") {
      return {
        success: false,
        reason: "already_used",
        message: `La orden ya tiene estado: ${order.status}`,
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(paymentsLog).values({
        orderId,
        providerId: this.id,
        amountBsCents: order.grandTotalBsCents,
        senderPhone: order.customerPhone,
        providerRaw: { confirmedBy: adminUserId },
        outcome: "manual",
        confirmedBy: adminUserId,
      });
    });

    return {
      success: true,
      providerRaw: { confirmedBy: adminUserId },
    };
  }
}
