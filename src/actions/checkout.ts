"use server";
import { after } from "next/server";
import { CheckoutItem } from "@/lib/types/checkout";
import { processCheckout } from "@/services/order.service";
import { upsertCustomer } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { checkoutSchema } from "@/lib/validations/checkout";
import { actionClient } from "@/lib/safe-action";
import { rateLimiters } from "@/lib/rate-limit";
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
        ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
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

      // 2. Delegate entire business logic to service
      const { order, initResult, subtotalBsCents, grandTotalBsCents, snapshotItems, settings, surchargesSnapshot } = await processCheckout({
        items,
        input: parsed.output,
      });

      // 3. Side effects (Customer upsert and WhatsApp)
      if (parsed.output.name || parsed.output.cedula) {
        await upsertCustomer(parsed.output.phone, parsed.output.name ?? null, parsed.output.cedula ?? null);
      }

      after(async () => {
        try {
          const rate = parseFloat(order.rateSnapshotBsPerUsd);
          await sendOrderMessage({
            templateKey: "received",
            phone: parsed.output.phone,
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


