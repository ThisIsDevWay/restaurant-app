"use server";

import { after } from "next/server";

import { getSettings, getActiveRate } from "@/db/queries/settings";
import { getMenuItemWithOptionsAndComponents } from "@/db/queries/menu";
import { createOrder } from "@/db/queries/orders";
import { getPendingOrdersCount } from "@/db/queries/orders";
import { upsertCustomer } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { usdCentsToBsCents } from "@/lib/money";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getActiveProvider } from "@/lib/payment-providers";
import type { PaymentInitResult } from "@/lib/payment-providers";
import { rateLimiters } from "@/lib/rate-limit";
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

    const { phone, paymentMethod, name, cedula } = parsed.output;

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

    // 2.5. Load daily pools for today
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
    }).format(new Date());

    // Daily adicionales pool
    const dailyAdicionalRows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
      })
      .from(dailyAdicionales)
      .innerJoin(menuItems, eq(dailyAdicionales.adicionalItemId, menuItems.id))
      .where(eq(dailyAdicionales.date, today));

    // Daily bebidas pool
    const dailyBebidaRows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
      })
      .from(dailyBebidas)
      .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
      .where(eq(dailyBebidas.date, today));

    // Build lookup maps
    const dailyAdicionalMap = new Map(dailyAdicionalRows.map((a) => [a.id, a]));
    const dailyBebidaMap = new Map(dailyBebidaRows.map((b) => [b.id, b]));

    // Load daily contornos pool (for contorno substitutions)
    const dailyContornoRows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isAvailable: menuItems.isAvailable,
      })
      .from(dailyContornos)
      .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
      .where(eq(dailyContornos.date, today));
    const globalContornoMap = new Map(dailyContornoRows.map((c) => [c.id, c]));

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
      quantity: number;
      itemTotalBsCents: number;
    }> = [];

    for (const clientItem of items) {
      const menuItem = await getMenuItemWithOptionsAndComponents(clientItem.id);
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
      const selectedBebidas: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
      }> = [];

      // Process removed components (discounts)
      let removalAdjustmentUsdCents = 0;
      for (const removal of clientItem.removedComponents) {
        removalAdjustmentUsdCents -= removal.priceUsdCents; // subtract = discount
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

      // Validate adicionales against daily pool (and legacy optionGroups fallback)
      for (const ad of clientItem.selectedAdicionales) {
        let found = false;

        // First look in daily adicionales pool
        const dailyAdicional = dailyAdicionalMap.get(ad.id);
        if (dailyAdicional && dailyAdicional.isAvailable) {
          optionPriceUsdCents += dailyAdicional.priceUsdCents;
          selectedAdicionales.push({
            id: dailyAdicional.id,
            name: dailyAdicional.name,
            priceUsdCents: dailyAdicional.priceUsdCents,
            priceBsCents: usdCentsToBsCents(dailyAdicional.priceUsdCents, rate),
            substitutesComponentId: ad.substitutesComponentId,
            substitutesComponentName: ad.substitutesComponentName,
          });
          found = true;
        }

        // Fallback: look in menuItem adicionales (for backward compat)
        if (!found) {
          const validAdicional = menuItem.adicionales.find((a) => a.id === ad.id && a.isAvailable);
          if (validAdicional) {
            optionPriceUsdCents += validAdicional.priceUsdCents;
            selectedAdicionales.push({
              id: validAdicional.id,
              name: validAdicional.name,
              priceUsdCents: validAdicional.priceUsdCents,
              priceBsCents: usdCentsToBsCents(validAdicional.priceUsdCents, rate),
              substitutesComponentId: ad.substitutesComponentId,
              substitutesComponentName: ad.substitutesComponentName,
            });
            found = true;
          }
        }

        // Fallback: look in menuItem contornos (for contorno substitutions)
        if (!found) {
          const validContorno = menuItem.contornos.find((c) => c.id === ad.id && c.isAvailable);
          if (validContorno) {
            optionPriceUsdCents += validContorno.priceUsdCents;
            selectedAdicionales.push({
              id: validContorno.id,
              name: validContorno.name,
              priceUsdCents: validContorno.priceUsdCents,
              priceBsCents: usdCentsToBsCents(validContorno.priceUsdCents, rate),
              substitutesComponentId: ad.substitutesComponentId,
              substitutesComponentName: ad.substitutesComponentName,
            });
            found = true;
          }
        }

        // Fallback: look in global contornos table
        if (!found) {
          const globalContorno = globalContornoMap.get(ad.id);
          if (globalContorno && globalContorno.isAvailable) {
            optionPriceUsdCents += globalContorno.priceUsdCents;
            selectedAdicionales.push({
              id: globalContorno.id,
              name: globalContorno.name,
              priceUsdCents: globalContorno.priceUsdCents,
              priceBsCents: usdCentsToBsCents(globalContorno.priceUsdCents, rate),
              substitutesComponentId: ad.substitutesComponentId,
              substitutesComponentName: ad.substitutesComponentName,
            });
            found = true;
          }
        }

        // Fallback for legacy items that might still be in `optionGroups`
        if (!found) {
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
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }

      // Validate bebidas against daily pool (and fallback to menuItem bebidas)
      if (clientItem.selectedBebidas) {
        for (const beb of clientItem.selectedBebidas) {
          let found = false;

          // First look in daily bebidas pool
          const dailyBebida = dailyBebidaMap.get(beb.id);
          if (dailyBebida && dailyBebida.isAvailable) {
            optionPriceUsdCents += dailyBebida.priceUsdCents;
            selectedBebidas.push({
              id: dailyBebida.id,
              name: dailyBebida.name,
              priceUsdCents: dailyBebida.priceUsdCents,
              priceBsCents: usdCentsToBsCents(dailyBebida.priceUsdCents, rate),
            });
            found = true;
          }

          // Fallback: look in menuItem bebidas
          if (!found) {
            const validBebida = menuItem.bebidas?.find((b) => b.id === beb.id && b.isAvailable);
            if (validBebida) {
              optionPriceUsdCents += validBebida.priceUsdCents;
              selectedBebidas.push({
                id: validBebida.id,
                name: validBebida.name,
                priceUsdCents: validBebida.priceUsdCents,
                priceBsCents: usdCentsToBsCents(validBebida.priceUsdCents, rate),
              });
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
        selectedBebidas,
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
        console.error("WhatsApp Error:", err);
      }
    });

    return {
      success: true,
      orderId: order.id,
      expiresAt: expiresAt.toISOString(),
      initResult,
    };
  } catch (error) {
    console.error("[processCheckout] Unhandled error:", error);
    return {
      success: false,
      error: "Error inesperado. Por favor intenta de nuevo.",
    };
  }
}
