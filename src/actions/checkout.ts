"use server";

import { after } from "next/server";

import { getSettings, getActiveRate } from "@/db/queries/settings";
import { getPendingOrdersCount } from "@/db/queries/orders";
import { createOrder, calculateOrderTotals } from "@/services/order.service";
import { upsertCustomer } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { usdCentsToBsCents } from "@/lib/money";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { getActiveProvider } from "@/lib/payment-providers";
import type { PaymentInitResult } from "@/lib/payment-providers";
import { actionClient } from "@/lib/safe-action";
import { rateLimiters } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { db } from "@/db";
import { dailyAdicionales, dailyBebidas, dailyContornos, menuItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import * as v from "valibot";

export type CheckoutResult =
  | {
    success: true;
    orderId: string;
    expiresAt: string;
    initResult: PaymentInitResult;
  }
  | { success: false; error: string; field?: string };

export type CheckoutItem = {
  id: string;
  quantity: number;
  fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
    substitutesComponentId?: string;
    substitutesComponentName?: string;
  }>;
  selectedBebidas?: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  removedComponents: Array<{
    isRemoval: true;
    componentId: string;
    name: string;
    priceUsdCents: number;
  }>;
  categoryAllowAlone: boolean;
};

export const processCheckoutAction = actionClient
  .schema(v.object({ input: v.any(), items: v.any() }))
  .action(async ({ parsedInput }) => {
    const { input, items } = parsedInput as { input: CheckoutInput; items: CheckoutItem[] };
    try {
      // Rate limit
      let ip = "127.0.0.1";
      try {
        ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
      } catch {
        // No request context (e.g., in tests)
      }
      const { success } = await rateLimiters.checkout.limit(ip);
      if (!success) {
        return { success: false, error: "Demasiados intentos. Espera un momento." };
      }

      // 1. Validate input
      const parsed = v.safeParse(checkoutSchema, input);
      if (!parsed.success) {
        const issue = parsed.issues[0];
        return {
          success: false,
          error: issue.message,
          field: issue.path?.[0]?.key as string | undefined,
        };
      }

      const { phone, paymentMethod, name, cedula, orderMode, deliveryAddress } = parsed.output;

      // 2.5. Validate that cart doesn't contain ONLY restricted items
      const allRestricted = items.every((item) => !item.categoryAllowAlone);
      if (allRestricted && items.length > 0) {
        return {
          success: false,
          error: "No puedes pedir solo bebidas o adicionales. Agrega un plato principal.",
          field: "items",
        };
      }

      // 2. Get settings & rate
      const settings = await getSettings();
      if (!settings) {
        return { success: false, error: "Configuración no encontrada" };
      }

      // 2.1. Check max pending orders
      const pendingCount = await getPendingOrdersCount();
      if (pendingCount >= settings.maxPendingOrders) {
        return { success: false, error: "No podemos recibir más pedidos ahora. Intenta en unos minutos." };
      }

      const rateResult = await getActiveRate();
      if (!rateResult) {
        return {
          success: false,
          error: "Tasa de cambio no disponible. Intenta más tarde.",
        };
      }
      const rate = rateResult.rate;

      // 2.5. Calculate totals via order.service
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Caracas",
      }).format(new Date());

      const { snapshotItems, subtotalUsdCents, subtotalBsCents } = await calculateOrderTotals(items, rate, today);

      // 4. Get active provider
      const provider = getActiveProvider(settings);

      // 5. Create order
      const expiresAt = new Date(
        Date.now() + settings.orderExpirationMinutes * 60 * 1000,
      );

      const order = await createOrder({
        customerPhone: phone,
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        status: provider.id === "whatsapp_manual" ? "whatsapp" : "pending",
        paymentMethod,
        paymentProvider: provider.id,
        orderMode: orderMode ?? null,
        deliveryAddress: deliveryAddress ?? null,
        exchangeRateId: settings.currentRateId!,
        rateSnapshotBsPerUsd: rate.toString(),
        expiresAt,
      });

      // 6. Provider-specific init
      let initResult = await provider.initiatePayment(order, settings);

      // If transfer, we override the bank details to show transfer info instead of P2P (Pago Móvil)
      if (paymentMethod === "transfer") {
        initResult = {
          screen: "enter_reference",
          totalBsCents: subtotalBsCents,
          bankDetails: {
            bankName: settings.bankName,
            bankCode: settings.bankCode,
            accountPhone: settings.accountPhone,
            accountRif: settings.accountRif,
            transferBankName: settings.transferBankName,
            transferAccountName: settings.transferAccountName,
            transferAccountNumber: settings.transferAccountNumber,
            transferAccountRif: settings.transferAccountRif,
          },
        };
      }

      // 7. Save/upsert customer data
      if (name || cedula) {
        await upsertCustomer(phone, name ?? null, cedula ?? null);
      }

      // 8. Send WhatsApp confirmation (Vercel-safe fire-and-forget via after())
      after(async () => {
        try {
          await sendOrderMessage(
            "received",
            phone,
            String(order.orderNumber),
            name ?? null,
            snapshotItems,
            subtotalBsCents,
            undefined,
            settings.whatsappMicroserviceUrl,
          );
        } catch (err) {
          logger.error("WhatsApp Error", { error: String(err) });
        }
      });

      return {
        success: true,
        orderId: order.id,
        expiresAt: expiresAt.toISOString(),
        initResult,
      } as CheckoutResult;
    } catch (error) {
      logger.error("[processCheckout] Unhandled error", { error: String(error) });
      return {
        success: false,
        error: "Error inesperado. Por favor intenta de nuevo.",
      } as CheckoutResult;
    }
  });


