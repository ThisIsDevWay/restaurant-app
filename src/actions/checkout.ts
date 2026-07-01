"use server";
import { after } from "next/server";
import { CheckoutItem } from "@/lib/types/checkout";
import { processCheckout } from "@/services/order.service";
import { upsertCustomer } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { checkoutSchema } from "@/lib/validations/checkout";
import { actionClient } from "@/lib/safe-action";
import { rateLimiters, getIPFromHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import * as v from "valibot";

export type CheckoutResult =
  | {
    success: true;
    orderId: string;
    expiresAt: string;
    initResult: any; // Simplified for now, or use PaymentInitResult
  }
  | { success: false; error: string; field?: string };

export const processCheckoutAction = actionClient
  .schema(v.object({ input: v.any(), items: v.any() }))
  .action(async ({ parsedInput }) => {
    const { input, items } = parsedInput as { input: any; items: CheckoutItem[] };
    try {
      // Rate limit
      let ip = "127.0.0.1";
      try {
        ip = getIPFromHeaders(await headers());
      } catch {
        // No request context
      }
      const { success } = await rateLimiters.checkout.limit(ip);
      if (!success) {
        return { success: false, error: "Demasiados intentos. Espera un momento." };
      }

      // 1. Validate basic input structure (now includes clientSurcharges)
      const parsed = v.safeParse(checkoutSchema, input);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.issues[0].message,
          field: parsed.issues[0].path?.[0]?.key as string,
        };
      }

      // Log for idempotency debugging
      logger.info("[CheckoutAction] Received token", { token: parsed.output.checkoutToken });

      // 2. Delegate entire business logic to service
      const { order, initResult, subtotalBsCents, grandTotalBsCents, snapshotItems, settings, surchargesSnapshot } = await processCheckout({
        items,
        input: parsed.output,
      });

      // 3. Side effects (WhatsApp)

      after(async () => {
        // Solo enviar "received" en checkout para whatsapp_manual + transfer.
        // Razón: en whatsapp_manual la orden ya fue coordinada manualmente en el
        // formulario, por lo que el mensaje de confirmación tiene sentido de inmediato.
        //
        // Para proveedores de conciliación automática (banesco_reference, mercantil_c2p)
        // el pago AÚN no ha sido verificado cuando se crea la orden (status = "pending").
        // El mensaje "received" se enviará en /api/payment-confirm tras verificación exitosa.
        //
        // Para whatsapp_manual + pago_movil: el PagoMovilScreen maneja la comunicación
        // vía WhatsApp con comprobante, así que tampoco enviamos aquí.
        const isWhatsAppManual = settings.activePaymentProvider === "whatsapp_manual";
        const isPagoMovil = parsed.output.paymentMethod === "pago_movil";
        const isEfectivo = parsed.output.paymentMethod === "efectivo";

        const shouldSendNow = isWhatsAppManual && !isPagoMovil && !isEfectivo;
        if (!shouldSendNow) return;

        try {
          const rate = parseFloat(order.rateSnapshotBsPerUsd);
          await sendOrderMessage({
            templateKey: "received",
            phone: order.customerPhone,
            orderId: order.id,
            paymentMethod: order.paymentMethod,
            orderNumber: String(order.orderNumber),
            customerName: parsed.output.name ?? null,
            items: snapshotItems,
            grandTotalBsCents,
            surcharges: surchargesSnapshot
              ? {
                packagingUsdCents: surchargesSnapshot.packagingUsdCents,
                deliveryUsdCents: surchargesSnapshot.deliveryUsdCents,
                rate,
                orderMode: surchargesSnapshot.orderMode,
              }
              : undefined,
            baseUrl: settings.whatsappMicroserviceUrl,
            deliveryAddress: order.deliveryAddress,
            gpsCoords: order.gpsCoords,
          });
        } catch (err) {
          logger.error("WhatsApp Error", { error: String(err) });
        }
      });

      return {
        success: true,
        orderId: order.id,
        expiresAt: order.expiresAt!.toISOString(),
        initResult,
      } as CheckoutResult;
    } catch (error: any) {
      logger.error("[processCheckoutAction] Error", { error: error.message });
      return {
        success: false,
        error: error.message || "Error inesperado. Por favor intenta de nuevo.",
      } as CheckoutResult;
    }
  });
export const registerComprobanteAction = actionClient
  .schema(v.object({
    orderId: v.pipe(v.string(), v.uuid()),
    uploadedUrl: v.pipe(v.string(), v.url())
  }))
  .action(async ({ parsedInput }) => {
    const { orderId, uploadedUrl } = parsedInput;
    try {
      const { db } = await import("@/db");
      const { orders } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(orders)
        .set({
          paymentMetadata: { uploadedUrl },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      return { success: true };
    } catch (error: any) {
      logger.error("[registerComprobanteAction] Error", { error: error.message });
      return { success: false, error: "Error al registrar comprobante" };
    }
  });

export const fallbackToWhatsAppAction = actionClient
  .schema(v.object({ orderId: v.pipe(v.string(), v.uuid()) }))
  .action(async ({ parsedInput: { orderId } }) => {
    try {
      const { db } = await import("@/db");
      const { orders } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const { getSettings } = await import("@/db/queries/settings");
      const { getOrderById } = await import("@/db/queries/orders");
      const { WhatsAppManualProvider } = await import("@/lib/payment-providers/whatsapp-manual");

      const order = await getOrderById(orderId);
      if (!order) throw new Error("Orden no encontrada");

      const settings = await getSettings();
      if (!settings) throw new Error("Configuración no encontrada");

      // Update order to manual WhatsApp status and manual provider
      await db
        .update(orders)
        .set({
          paymentProvider: "whatsapp_manual",
          status: "whatsapp",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      const updatedOrder = {
        ...order,
        paymentProvider: "whatsapp_manual" as const,
        status: "whatsapp" as const,
      };

      const provider = new WhatsAppManualProvider(settings);
      const initResult = await provider.initiatePayment(updatedOrder, settings);

      return { success: true, initResult };
    } catch (error: any) {
      logger.error("fallbackToWhatsAppAction error", { error: error.message, orderId });
      return { success: false, error: error.message || "Error al cambiar a WhatsApp" };
    }
  });

