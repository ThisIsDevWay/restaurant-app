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

export class BanescoReferenceProvider implements PaymentProvider {
  readonly id = "banesco_reference" as const;
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
      totalBsCents: order.subtotalBsCents,
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
        message: "Tipo de confirmación no soportado para este provider",
      };
    }

    const { reference, orderId } = input;

    if (!reference || reference.trim().length < 8) {
      return {
        success: false,
        reason: "invalid_reference",
        message: "La referencia debe tener al menos 8 caracteres",
      };
    }

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

    // Check idempotency
    const [existingLog] = await db
      .select()
      .from(paymentsLog)
      .where(eq(paymentsLog.reference, reference.trim()))
      .limit(1);

    if (existingLog) {
      return {
        success: false,
        reason: "already_used",
        message: "Esta referencia ya fue utilizada",
      };
    }

    // Verify amount with Banesco API (or mock)
    const mockMode = process.env.BANESCO_API_MOCK === "true" || !this.settings.banescoApiKey;
    let apiResponse: unknown;

    if (mockMode) {
      // In mock mode, accept any reference with 8+ digits
      apiResponse = {
        status: "approved",
        amount: order.subtotalBsCents / 100,
        reference: reference.trim(),
        mock: true,
      };
    } else {
      try {
        const apiKey = this.settings.banescoApiKey;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `https://api.banesco.com/payment/verify/${reference.trim()}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);

        if (!res.ok) {
          return {
            success: false,
            reason: "api_error",
            message: "Error al verificar con el banco",
          };
        }

        apiResponse = await res.json();
      } catch {
        Sentry.captureException(new Error("Banesco API timeout"), {
          extra: { orderId, reference: reference.trim() },
        });
        return {
          success: false,
          reason: "api_error",
          message: "No se pudo contactar la API del banco",
        };
      }
    }

    // Verify amount (tolerance ±1 centavo)
    const apiAmount = (apiResponse as { amount: number }).amount;
    const expectedAmount = order.subtotalBsCents / 100;
    if (Math.abs(apiAmount - expectedAmount) > 0.01) {
      return {
        success: false,
        reason: "amount_mismatch",
        message: `Monto no coincide. Se esperaba Bs. ${expectedAmount.toFixed(2)}, se recibió Bs. ${apiAmount.toFixed(2)}`,
      };
    }

    // Transaction: update order + insert payment log
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: "paid",
          paymentReference: reference.trim(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(paymentsLog).values({
        orderId,
        providerId: this.id,
        amountBsCents: order.subtotalBsCents,
        reference: reference.trim(),
        senderPhone: order.customerPhone,
        providerRaw: apiResponse,
        outcome: "confirmed",
      });
    });

    return {
      success: true,
      providerRaw: apiResponse,
      reference: reference.trim(),
    };
  }
}
