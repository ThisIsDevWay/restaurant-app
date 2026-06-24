import type {
  PaymentProvider,
  PaymentInitResult,
  PaymentConfirmInput,
  PaymentConfirmResult,
  BankDetails,
  SettingsRow,
  OrderRow,
} from "./types";
import { PabiloClient, PabiloError } from "@pabilo/sdk";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { translateStatus } from "@/lib/constants/order-status";

export class PabiloBdvProvider implements PaymentProvider {
  readonly id = "pabilo_bdv" as const;
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
        message: "La referencia debe tener al menos 4 caracteres",
      };
    }

    // Get order details
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

    // Check idempotency (paymentsLog)
    const [existingLog] = await db
      .select()
      .from(paymentsLog)
      .where(eq(paymentsLog.reference, cleanRef))
      .limit(1);

    if (existingLog) {
      return {
        success: false,
        reason: "already_used",
        message: "Esta referencia ya fue utilizada",
      };
    }

    const pabiloApiKey = this.settings.pabiloApiKey || process.env.PABILO_API_KEY;
    const userBankId = this.settings.pabiloUserBankId || process.env.PABILO_USER_BANK_ID;

    if (!pabiloApiKey || !userBankId) {
      logger.error("Pabilo configuration missing in settings and environment variables", { orderId });
      return {
        success: false,
        reason: "api_error",
        message: "Error de configuración interna (API Key / Bank ID faltante)",
      };
    }

    let apiResponse: any;

    try {
      const client = new PabiloClient({ apiKey: pabiloApiKey });
      // Direct verification via Pabilo SDK (Estrategia A)
      const result = await client.payments.verify(
        userBankId,
        {
          bankReference: cleanRef,
          amount: order.grandTotalBsCents / 100, // API expects decimal format e.g. 150.75
          movementType: "GENERIC", // GENERIC type for BDV personal
        }
      );

      if (result.found) {
        if (result.isNew) {
          apiResponse = result.data;
        } else {
          logger.warn("Intento de reutilizar referencia (Pabilo ya la verificó en otro momento)", { orderId, reference: cleanRef });
          return {
            success: false,
            reason: "already_used",
            message: "Esta referencia ya fue utilizada anteriormente en Pabilo",
          };
        }
      } else {
        if (result.reason === "BANK_NOT_AVAILABLE") {
          return {
            success: false,
            reason: "api_error",
            message: "El portal del banco no se encuentra disponible temporalmente",
          };
        }
        return {
          success: false,
          reason: "invalid_reference",
          message: "Referencia no encontrada en la cuenta receptora",
        };
      }
    } catch (err: any) {
      if (err instanceof PabiloError) {
        logger.error("Pabilo SDK verify error", { code: err.code, status: err.statusCode, raw: err.raw, orderId });
        Sentry.captureException(err, { extra: { context: "pabilo-verify", orderId, code: err.code } });

        switch (err.code) {
          case "PAYMENT_NOT_FOUND":
            return {
              success: false,
              reason: "invalid_reference",
              message: "Referencia no encontrada en la cuenta receptora",
            };
          case "PAYMENT_ALREADY_EXISTS":
            logger.warn("Intento de reutilizar referencia (Pabilo reporta PAYMENT_ALREADY_EXISTS)", { orderId, reference: cleanRef });
            return {
              success: false,
              reason: "already_used",
              message: "Esta referencia ya fue utilizada anteriormente en Pabilo",
            };
          case "PAYMENT_AMOUNT_NOT_VALID":
            return {
              success: false,
              reason: "amount_mismatch",
              message: "El monto de la transferencia no coincide con el total de la orden",
            };
          case "USER_BANCK_BAD_PASSWORD":
          case "USER_BANCK_PASSWORD_EXPIRED":
            logger.error("CRITICAL: Banco de Venezuela credentials are bad or expired", { code: err.code });
            return {
              success: false,
              reason: "api_error",
              message: "Error de conexión bancaria. El administrador ha sido notificado.",
            };
          case "BANK_NOT_AVAILABLE":
          case "BANK_TOO_MANY_REQUESTS":
            return {
              success: false,
              reason: "api_error",
              message: "El portal del banco no se encuentra disponible temporalmente",
            };
          case "NOT_ENOUGH_CREDITS":
          case "PLAN_IS_NOT_ACTIVE":
          case "REQUEST_LIMIT_REACHED":
          case "BANK_ACCOUNT_LIMIT_REACHED":
            return {
              success: false,
              reason: "api_error",
              message: "Límite de verificación automatizada alcanzado. El administrador ha sido notificado.",
            };
          case "BAD_REQUEST":
          case "UNAUTHORIZED":
          case "FORBIDDEN":
          case "NOT_FOUND":
          case "USER_BANK_ALREADY_EXISTS":
            return {
              success: false,
              reason: "api_error",
              message: "Error de configuración de la pasarela de pagos. Reportado al administrador.",
            };
          case "INTERNAL_ERROR":
          case "NETWORK_ERROR":
          default:
            return {
              success: false,
              reason: "api_error",
              message: "Error de conexión con el sistema de verificación. Intenta de nuevo.",
            };
        }
      } else {
        logger.error("Unhandled Pabilo verification error", { error: err.message, orderId });
        Sentry.captureException(err, { extra: { context: "pabilo-verify-unhandled", orderId } });
      }

      return {
        success: false,
        reason: "api_error",
        message: "No se pudo contactar al sistema de verificación. Intenta de nuevo.",
      };
    }

    // Transaction: update order + insert paymentsLog
    const txResult = await db.transaction(async (tx) => {
      // Re-verify paymentsLog reference within transaction with advisory lock
      const [existingLog] = await tx
        .select()
        .from(paymentsLog)
        .where(eq(paymentsLog.reference, cleanRef))
        .for("update")
        .limit(1);

      if (existingLog) {
        return {
          success: false as const,
          reason: "already_used" as const,
          message: "Esta referencia ya fue utilizada",
        };
      }

      await tx
        .update(orders)
        .set({
          status: "paid",
          paymentReference: cleanRef,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(paymentsLog).values({
        orderId,
        providerId: this.id,
        amountBsCents: order.grandTotalBsCents,
        reference: cleanRef,
        senderPhone: order.customerPhone,
        providerRaw: apiResponse || {},
        outcome: "confirmed",
      });

      return null;
    });

    if (txResult) {
      return txResult;
    }

    logger.info("Pago verificado exitosamente vía Pabilo BDV", {
      orderId,
      reference: cleanRef,
      amount: order.grandTotalBsCents / 100,
    });

    return {
      success: true,
      providerRaw: apiResponse,
      reference: cleanRef,
    };
  }
}
