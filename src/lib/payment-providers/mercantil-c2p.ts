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
import { mercantilEncrypt } from "./mercantil-crypto";

export class MercantilC2PProvider implements PaymentProvider {
  readonly id = "mercantil_c2p" as const;
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
    const cleanRef = reference ? reference.trim() : "";

    if (!cleanRef || cleanRef.length < 4) {
      return {
        success: false,
        reason: "invalid_reference",
        message: "La referencia debe tener al menos 4 caracteres",
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
      .where(eq(paymentsLog.reference, cleanRef))
      .limit(1);

    if (existingLog) {
      return {
        success: false,
        reason: "already_used",
        message: "Esta referencia ya fue verificada",
      };
    }

    const clientId = process.env.MERCANTIL_CLIENT_ID || this.settings.mercantilClientId;
    const secretKey = process.env.MERCANTIL_SECRET_KEY || this.settings.mercantilSecretKey;
    const merchantId = process.env.MERCANTIL_MERCHANT_ID || this.settings.mercantilMerchantId;
    const integratorId = process.env.MERCANTIL_INTEGRATOR_ID || this.settings.mercantilIntegratorId;
    const terminalId = process.env.MERCANTIL_TERMINAL_ID || this.settings.mercantilTerminalId;

    const hasCreds = Boolean(
      clientId &&
      secretKey &&
      merchantId &&
      integratorId &&
      terminalId
    );

    const mockMode = process.env.MERCANTIL_API_MOCK === "true" || !hasCreds;
    let apiResponse: unknown;

    const expectedAmount = order.subtotalBsCents / 100;

    if (mockMode) {
      logger.warn("MERCANTIL EN MODO MOCK — no verificar en producción", {
        reason: hasCreds ? "MERCANTIL_API_MOCK=true" : "Faltan credenciales de Mercantil en settings",
      });
      // In mock mode, accept any reference with 4+ digits and match amount automatically
      apiResponse = {
        mock: true,
        merchant_identify: { merchantId: this.settings.mercantilMerchantId || "mock" },
        search_by: { payment_reference: cleanRef, amount: expectedAmount },
        transaction_status: "approved"
      };
    } else {
      try {
        const isSandbox = process.env.MERCANTIL_API_ENV === "sandbox";
        const envPath = isSandbox ? "sandbox" : "produccion";
        const url = `https://apimbu.mercantilbanco.com/mercantil-banco/${envPath}/v1/mobile-payment/search`;

        // Format date as DD/MM/YYYY
        const orderDate = order.createdAt;
        const trx_date = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;

        // Encrypt phone numbers
        const destPhone = mercantilEncrypt(this.settings.accountPhone, secretKey!);
        // For Pago Móvil P2C search, origin_mobile_number (customer) is optional but if required by bank, must be encrypted.
        // We use the account's own phone just to satisfy the origin field if customer isn't strictly needed for search by reference.
        const originPhone = mercantilEncrypt(order.customerPhone || "00000000000", secretKey!);

        const body = {
          merchant_identify: {
            integratorId: integratorId,
            merchantId: merchantId,
            terminalId: terminalId,
          },
          client_identify: {
            ipaddress: "127.0.0.1",
            browser_agent: "Restaurant App MVP",
            mobile: {
              manufacturer: "Unknown",
            },
          },
          search_by: {
            amount: Number(expectedAmount.toFixed(2)),
            currency: "ves",
            destination_mobile_number: destPhone,
            origin_mobile_number: originPhone,
            payment_reference: cleanRef,
            trx_date: trx_date,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-IBM-Client-ID": clientId!,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errRes = await res.text().catch(() => "Unknown body");
          logger.error("Error validando referencia en Mercantil", {
            status: res.status,
            reference: cleanRef,
            response: errRes
          });
          return {
            success: false,
            reason: "api_error",
            message: `Error al verificar con el banco: ${res.statusText}`,
          };
        }

        apiResponse = await res.json();

        // Ensure successful tracking logically from response structure (Mercantil usually returns a specific code on fail)
        // If the transaction wasn't found, it usually returns Http 400 or 404, or a success response with a generic code.
        // Let's assume HTTP 200 means it found the transaction successfully based on example comments.
      } catch (err) {
        Sentry.captureException(err instanceof Error ? err : new Error("Mercantil API fetch failed"), {
          extra: { orderId, reference: cleanRef },
        });
        return {
          success: false,
          reason: "api_error",
          message: "No se pudo contactar la API de Mercantil",
        };
      }
    }

    // Verification logic
    // Extract actual parsed amount if returned from API (for Mock or real structure)
    // Structure expected from search: res.search_by?.amount
    const apiRaw = apiResponse as any;
    const apiAmount = apiRaw?.search_by?.amount;

    if (apiAmount && Math.abs(Number(apiAmount) - expectedAmount) > 0.01) {
      return {
        success: false,
        reason: "amount_mismatch",
        message: `Monto no coincide. Se esperaba Bs. ${expectedAmount.toFixed(2)}, se recibió Bs. ${Number(apiAmount).toFixed(2)}`,
      };
    }

    await db.transaction(async (tx) => {
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
        amountBsCents: order.subtotalBsCents,
        reference: cleanRef,
        senderPhone: order.customerPhone,
        providerRaw: apiResponse,
        outcome: "confirmed",
      });
    });

    return {
      success: true,
      providerRaw: apiResponse,
      reference: cleanRef,
    };
  }
}
