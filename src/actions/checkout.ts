"use server";

import { getSettings, getActiveRate } from "@/db/queries/settings";
import { getMenuItemWithOptions } from "@/db/queries/menu";
import { createOrder } from "@/db/queries/orders";
import { usdCentsToBsCents } from "@/lib/money";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getActiveProvider } from "@/lib/payment-providers";
import type { PaymentInitResult } from "@/lib/payment-providers";
import { rateLimiters } from "@/lib/rate-limit";
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
  removedComponents: Array<{
    isRemoval: true;
    componentId: string;
    name: string;
    priceUsdCents: number;
  }>;
  categoryAllowAlone: boolean;
};

export async function processCheckout(
  input: unknown,
  items: CheckoutItem[],
): Promise<CheckoutResult> {
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

    const { phone, paymentMethod } = parsed.output;

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

    const rateResult = await getActiveRate();
    if (!rateResult) {
      return {
        success: false,
        error: "Tasa de cambio no disponible. Intenta más tarde.",
      };
    }
    const rate = rateResult.rate;

    // 3. Recalculate prices from DB — NEVER trust client prices
    let subtotalUsdCents = 0;
    const snapshotItems: Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      priceBsCents: number;
      fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
      selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        substitutesComponentId?: string;
        substitutesComponentName?: string;
      }>;
      removedComponents: Array<{
        isRemoval: true;
        componentId: string;
        name: string;
        priceUsdCents: number;
      }>;
      quantity: number;
      itemTotalBsCents: number;
    }> = [];

    for (const clientItem of items) {
      const menuItem = await getMenuItemWithOptions(clientItem.id);
      if (!menuItem) {
        return {
          success: false,
          error: `Item no encontrado: ${clientItem.id}`,
        };
      }
      if (!menuItem.isAvailable) {
        return {
          success: false,
          error: `"${menuItem.name}" ya no está disponible.`,
        };
      }

      let optionPriceUsdCents = 0;
      const fixedContornos: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
      }> = [];
      const selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        substitutesComponentId?: string;
        substitutesComponentName?: string;
      }> = [];

      // Process removed components (discounts)
      let removalAdjustmentUsdCents = 0;
      for (const removal of clientItem.removedComponents) {
        removalAdjustmentUsdCents += removal.priceUsdCents; // negative = discount
      }

      // Validate and add fixed contornos prices
      for (const fc of clientItem.fixedContornos) {
        const validContorno = menuItem.contornos.find(
          (c) => c.id === fc.id && c.isAvailable
        );
        if (validContorno) {
          optionPriceUsdCents += validContorno.priceUsdCents;
          fixedContornos.push({
            id: validContorno.id,
            name: validContorno.name,
            priceUsdCents: validContorno.priceUsdCents,
            priceBsCents: usdCentsToBsCents(validContorno.priceUsdCents, rate),
          });
        }
      }

      for (const ad of clientItem.selectedAdicionales) {
        for (const group of menuItem.optionGroups) {
          for (const opt of group.options) {
            if (opt.id === ad.id && opt.isAvailable) {
              optionPriceUsdCents += opt.priceUsdCents;
              selectedAdicionales.push({
                id: opt.id,
                name: opt.name,
                priceUsdCents: opt.priceUsdCents,
                priceBsCents: usdCentsToBsCents(opt.priceUsdCents, rate),
                substitutesComponentId: ad.substitutesComponentId,
                substitutesComponentName: ad.substitutesComponentName,
              });
              break;
            }
          }
        }
      }

      const itemUsdCents =
        (menuItem.priceUsdCents + optionPriceUsdCents + removalAdjustmentUsdCents) *
        clientItem.quantity;
      subtotalUsdCents += itemUsdCents;

      const itemBaseBsCents = usdCentsToBsCents(menuItem.priceUsdCents, rate);
      const itemTotalBsCents =
        usdCentsToBsCents(
          menuItem.priceUsdCents + optionPriceUsdCents + removalAdjustmentUsdCents,
          rate,
        ) * clientItem.quantity;

      snapshotItems.push({
        id: menuItem.id,
        name: menuItem.name,
        priceUsdCents: menuItem.priceUsdCents,
        priceBsCents: itemBaseBsCents,
        fixedContornos,
        selectedAdicionales,
        removedComponents: clientItem.removedComponents,
        quantity: clientItem.quantity,
        itemTotalBsCents,
      });
    }

    const subtotalBsCents = usdCentsToBsCents(subtotalUsdCents, rate);

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
      exchangeRateId: settings.currentRateId!,
      rateSnapshotBsPerUsd: rate.toString(),
      expiresAt,
    });

    // 6. Provider-specific init
    const initResult = await provider.initiatePayment(order, settings);

    return {
      success: true,
      orderId: order.id,
      expiresAt: expiresAt.toISOString(),
      initResult,
    };
  } catch {
    return {
      success: false,
      error: "Error inesperado. Por favor intenta de nuevo.",
    };
  }
}
