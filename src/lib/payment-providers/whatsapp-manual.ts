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

export class WhatsAppManualProvider implements PaymentProvider {
  readonly id = "whatsapp_manual" as const;
  readonly mode = "active" as const;

  constructor(_settings: SettingsRow) {}

  async initiatePayment(
    order: OrderRow,
    settings: SettingsRow,
  ): Promise<PaymentInitResult> {
    const snapshot = order.itemsSnapshot as Array<{
      name: string;
      quantity: number;
      selectedContorno: { name: string } | null;
      selectedAdicionales: Array<{ name: string }>;
      itemTotalBsCents: number;
    }>;

    const itemsText = snapshot
      .map((item) => {
        let line = `• ${item.quantity}× ${item.name}`;
        if (item.selectedContorno) {
          line += ` (${item.selectedContorno.name})`;
        }
        if (item.selectedAdicionales.length > 0) {
          line += ` + ${item.selectedAdicionales.map((a) => a.name).join(", ")}`;
        }
        const totalBs = (item.itemTotalBsCents / 100).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
        });
        line += ` — Bs. ${totalBs}`;
        return line;
      })
      .join("\n");

    const totalBs = (order.subtotalBsCents / 100).toLocaleString("es-VE", {
      minimumFractionDigits: 2,
    });

    const ref = (order.subtotalBsCents / 100).toFixed(2).replace(".", ",");

    const message = [
      `🍔 *Nuevo pedido G&M*`,
      ``,
      `📋 Detalle:`,
      itemsText,
      ``,
      `💰 Total: *Bs. ${totalBs}* (REF ${ref})`,
      `📱 Teléfono: ${order.customerPhone}`,
      ``,
      `¿Cómo deseas pagar?`,
      `□ Pago Móvil`,
      `□ Transferencia`,
      `□ Efectivo al recibir`,
    ].join("\n");

    const waNumber = settings.whatsappNumber || "584140000000";
    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    return {
      screen: "whatsapp",
      waLink,
      prefilledMessage: message,
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
        amountBsCents: order.subtotalBsCents,
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
