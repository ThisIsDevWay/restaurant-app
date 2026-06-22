import type {
  PaymentProvider,
  PaymentInitResult,
  PaymentConfirmInput,
  PaymentConfirmResult,
  BankDetails,
  SettingsRow,
  OrderRow,
} from "./types";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { parseDecimalStringToCents } from "@/services/payment.service";

export class PabiloNotificationsProvider implements PaymentProvider {
  readonly id = "pabilo_notifications" as const;
  readonly mode = "active" as const;

  private settings: SettingsRow;

  constructor(settings: SettingsRow) {
    this.settings = settings;
  }

  async initiatePayment(
    order: OrderRow,
    settings: SettingsRow,
  ): Promise<PaymentInitResult> {
    const bankDetails: BankDetails = {
      bankName: settings.bankName,
      bankCode: settings.bankCode,
      accountPhone: settings.accountPhone,
      accountRif: settings.accountRif,
    };

    return {
      screen: "enter_reference",
      totalBsCents: order.grandTotalBsCents,
      bankDetails,
    };
  }

  async confirmPayment(
    input: PaymentConfirmInput,
  ): Promise<PaymentConfirmResult> {
    if (input.type !== "reference") {
      return {
        success: false,
        reason: "invalid_reference",
        message: "Tipo de confirmación no soportado",
      };
    }

    const { reference, orderId } = input;
    const cleanRef = reference.trim();

    if (!cleanRef || cleanRef.length < 4) {
      return {
        success: false,
        reason: "invalid_reference",
        message: "La referencia debe tener al menos 4 dígitos",
      };
    }

    // 1. Get the order
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

    if (order.status !== "pending") {
      return {
        success: false,
        reason: "already_used",
        message: `La orden ya tiene estado: ${order.status}`,
      };
    }

    if (order.expiresAt < new Date()) {
      return {
        success: false,
        reason: "expired",
        message: "La orden ha expirado",
      };
    }

    // 2. Query Pabilo's SMS notifications API (Estrategia B, on-demand verification)
    const apiKey = this.settings.pabiloApiKey || process.env.PABILO_API_KEY;
    if (!apiKey) {
      logger.error("Pabilo API key missing in settings and environment variables", { orderId });
      return {
        success: false,
        reason: "api_error",
        message: "Error de configuración interna (API Key faltante)",
      };
    }

    try {
      // Fetch recent bank pay notifications
      const res = await fetch(
        "https://api.pabilo.app/v1/bank-pay-notifications?page=1&limit=50",
        {
          headers: {
            appKey: apiKey,
          },
        }
      );

      if (!res.ok) {
        let errorCode = "";
        try {
          const errData = await res.json();
          errorCode = errData.error || "";
        } catch (_) {}

        logger.error("Pabilo notifications endpoint returned error status", { status: res.status, errorCode, orderId });

        switch (errorCode) {
          case "UNAUTHORIZED":
          case "FORBIDDEN":
            return {
              success: false,
              reason: "api_error",
              message: "Error de configuración de la pasarela de pagos. Reportado al administrador.",
            };
          case "PLAN_IS_NOT_ACTIVE":
          case "REQUEST_LIMIT_REACHED":
            return {
              success: false,
              reason: "api_error",
              message: "Límite de verificación automatizada alcanzado. El administrador ha sido notificado.",
            };
          default:
            return {
              success: false,
              reason: "api_error",
              message: "Error al consultar notificaciones bancarias en Pabilo. Intenta de nuevo.",
            };
        }
      }

      const { notifications } = await res.json();
      const expectedAmountBsCents = order.grandTotalBsCents;

      // Find a matching notification (amount exact check + reference endsWith check)
      const match = notifications.find((notif: any) => {
        if (notif.status !== "CONFIRMED") return false;
        const notifRef = String(notif.reference ?? "").trim();
        if (!notifRef) return false;

        const notifAmountBsCents = parseDecimalStringToCents(notif.amount);
        return notifRef.endsWith(cleanRef) && notifAmountBsCents === expectedAmountBsCents;
      });

      if (match) {
        // Mark as paid in transaction
        const txResult = await db.transaction(async (tx) => {
          // Double check paymentsLog for duplicate matching references
          const [existingLog] = await tx
            .select()
            .from(paymentsLog)
            .where(eq(paymentsLog.reference, match.reference))
            .for("update")
            .limit(1);

          if (existingLog) {
            logger.warn("Intento de reutilizar referencia detectado en Notificaciones Pabilo", { orderId, reference: match.reference });
            return {
              success: false as const,
              reason: "already_used" as const,
              message: "Esta referencia ya fue utilizada anteriormente en otro pedido",
            };
          }

          await tx
            .update(orders)
            .set({
              status: "paid",
              paymentReference: match.reference,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

          await tx.insert(paymentsLog).values({
            orderId,
            providerId: this.id,
            amountBsCents: expectedAmountBsCents,
            reference: match.reference,
            senderPhone: match.from || order.customerPhone,
            providerRaw: match,
            outcome: "confirmed",
          });

          return null;
        });

        if (txResult) {
          return txResult;
        }

        return {
          success: true,
          reference: match.reference,
          providerRaw: match,
        };
      } else {
        // Save the reference entered by the client so the cron can find it later
        await db
          .update(orders)
          .set({
            paymentReference: cleanRef,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        return {
          success: false,
          reason: "invalid_reference",
          message: "Pago aún no detectado. Si ya transferiste, espera 1-2 minutos y presiona verificar de nuevo.",
        };
      }
    } catch (err: any) {
      logger.error("Error in Pabilo notifications confirmPayment", { error: err.message, orderId });
      Sentry.captureException(err, { extra: { context: "pabilo-notifications-confirm", orderId } });
      return {
        success: false,
        reason: "api_error",
        message: "Error de red al conectar con Pabilo. Por favor intenta de nuevo.",
      };
    }
  }
}
