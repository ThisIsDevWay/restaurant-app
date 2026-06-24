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
import { eq, or, like, sql, and, isNotNull } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { reconcileSingleOrder } from "@/services/payment.service";
import { translateStatus } from "@/lib/constants/order-status";

export class LocalNotificationsProvider implements PaymentProvider {
  readonly id = "local_notifications" as const;
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

    // Check if the reference exists in bankNotifications (A1: suffix-4 match)
    const matchedNotifs = await db
      .select()
      .from(bankNotifications)
      .where(eq(bankNotifications.status, "pending"));

    const matches = matchedNotifs.filter(
      (n) => n.reference.slice(-4) === cleanRef.slice(-4)
    );

    if (matches.length > 1) {
      return {
        success: false,
        reason: "invalid_reference",
        message: "Ambigüedad detectada en el pago móvil. Por favor contacta al administrador.",
      };
    }

    const targetNotif = matches[0];

    if (targetNotif && targetNotif.amountBsCents !== order.grandTotalBsCents) {
      return {
        success: false,
        reason: "amount_mismatch",
        message: "El monto del pago móvil recibido no coincide con el total de tu orden.",
      };
    }

    // M4: Check duplicate using full reference from bank notification if found.
    // If not found (already reconciled), check if payments_log contains any reference ending in the client's suffix-4.
    let duplicateQuery;
    if (targetNotif) {
      duplicateQuery = eq(paymentsLog.reference, targetNotif.reference);
    } else {
      duplicateQuery = sql`right(${paymentsLog.reference}, 4) = ${cleanRef.slice(-4)}`;
    }

    const [existingLog] = await db
      .select()
      .from(paymentsLog)
      .where(and(isNotNull(paymentsLog.reference), duplicateQuery))
      .limit(1);

    if (existingLog) {
      return {
        success: false,
        reason: "already_used",
        message: "Esta referencia ya fue utilizada",
      };
    }

    // 2. Save the reference entered by the client first
    await db
      .update(orders)
      .set({
        paymentReference: cleanRef,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 3. Try to reconcile using the single order service
    const reconciled = await reconcileSingleOrder(orderId, cleanRef);
    if (reconciled) {
      // Find the payment log we just created to return it as providerRaw
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
      message: "Pago aún no detectado. Si ya transferiste, espera 1-2 minutos y presiona verificar de nuevo.",
    };
  }
}
