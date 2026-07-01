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
import { orders, paymentsLog, bankNotifications } from "@/db/schema";
import { eq, or, like, sql, and, isNotNull, gt } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { parseDecimalStringToCents, reconcileSingleOrder } from "@/services/payment.service";
import { translateStatus } from "@/lib/constants/order-status";
import { getReferenceSuffix } from "@/lib/reconciliation-rules";

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
    if (input.type === "manual") {
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

      if (order.status === "paid") {
        return {
          success: true,
          reference: order.paymentReference || "",
          providerRaw: { verified: true, alreadyPaid: true },
        };
      }

      if (order.status !== "pending") {
        return {
          success: false,
          reason: "already_used",
          message: `La orden ya tiene estado: ${translateStatus(order.status)}`,
        };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
            paymentMetadata: sql`coalesce(payment_metadata, '{}'::jsonb) || '{"outcome": "manual"}'::jsonb`,
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

    if (order.status === "paid") {
      return {
        success: true,
        reference: order.paymentReference || cleanRef,
        providerRaw: { verified: true, alreadyPaid: true },
      };
    }

    if (order.status !== "pending") {
      return {
        success: false,
        reason: "already_used",
        message: `La orden ya tiene estado: ${translateStatus(order.status)}`,
      };
    }

    const expirationToleranceMs = 10 * 60 * 1000;
    const isExpired = order.expiresAt.getTime() + expirationToleranceMs < Date.now();
    if (isExpired) {
      return {
        success: false,
        reason: "expired",
        message: "La orden ha expirado",
      };
    }

    // Save the client's reference immediately so it is captured regardless of any subsequent checks/failures!
    await db
      .update(orders)
      .set({
        paymentReference: cleanRef,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Check if the reference has already been used in another payment (cruzado bidireccional)
    const [existingLog] = await db
      .select()
      .from(paymentsLog)
      .where(
        and(
          isNotNull(paymentsLog.reference),
          or(
            eq(paymentsLog.reference, cleanRef),
            sql`reference LIKE ${"%" + cleanRef} OR ${cleanRef} LIKE concat('%', reference)`
          )
        )
      )
      .limit(1);

    if (existingLog) {
      return {
        success: false,
        reason: "already_used",
        message: "Esta referencia ya fue utilizada",
      };
    }

    // Check if the reference exists in bankNotifications but has a different amount
    const matchedNotifs = await db
      .select()
      .from(bankNotifications)
      .where(eq(bankNotifications.status, "pending"));

    const sameRefNotif = matchedNotifs.find(
      (n) => getReferenceSuffix(n.reference) === getReferenceSuffix(cleanRef)
    );

    if (sameRefNotif && sameRefNotif.amountBsCents !== order.grandTotalBsCents) {
      return {
        success: false,
        reason: "amount_mismatch",
        message: "El monto del pago móvil recibido no coincide con el total de tu orden.",
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

      // Get all existing references in bankNotifications (limited to 48 hours for performance)
      const existingNotifs = await db
        .select({ reference: bankNotifications.reference })
        .from(bankNotifications)
        .where(gt(bankNotifications.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)));

      // Save Pabilo's confirmed notifications into our unified bank_notifications table
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

      // 3. Try to reconcile using the unified reconciliation service
      const reconciled = await reconcileSingleOrder(orderId, cleanRef);
      if (reconciled) {
        const [log] = await db
          .select()
          .from(paymentsLog)
          .where(eq(paymentsLog.orderId, orderId))
          .limit(1);

        return {
          success: true,
          reference: log?.reference || cleanRef,
          providerRaw: log?.providerRaw || {},
        };
      }

      return {
        success: false,
        reason: "invalid_reference",
        message: "Pago no detectado. Si ya transferiste, espera 1–2 minutos y presiona verificar.",
      };
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
