"use server";

import { updateOrderStatus as updateOrderStatusService } from "@/services/order.service";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import { authenticatedActionClient } from "@/lib/safe-action";
import { after } from "next/server";
import { getOrderById } from "@/db/queries/orders";
import { getCustomerByPhone } from "@/db/queries/customers";
import { getSettings } from "@/db/queries/settings";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { logger } from "@/lib/logger";

export const updateOrderStatusAction = authenticatedActionClient
  .schema(
    v.object({
      orderId: v.string(),
      status: v.picklist(["kitchen", "delivered"]),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!["admin", "kitchen"].includes(ctx.user.role as string)) {
      throw new Error("No autorizado");
    }

    // La impresión de producción al entrar a cocina la maneja el servicio.
    await updateOrderStatusService(parsedInput.orderId, parsedInput.status);

    const STATUS_TO_TEMPLATE: Record<string, string> = {
      kitchen: "kitchen",
      delivered: "delivered",
    };
    const templateKey = STATUS_TO_TEMPLATE[parsedInput.status];

    if (templateKey) {
      after(async () => {
        try {
          const order = await getOrderById(parsedInput.orderId);
          if (!order) return;

          const [customer, settings] = await Promise.all([
            getCustomerByPhone(order.customerPhone),
            getSettings(),
          ]);
          if (!settings) return;

          const snapshotItems = order.itemsSnapshot as SnapshotItem[];
          const surchargesSnapshot = order.surchargesSnapshot as {
            packagingUsdCents: number;
            deliveryUsdCents: number;
            orderMode: string;
          } | null;
          const rate = parseFloat(order.rateSnapshotBsPerUsd);

          await sendOrderMessage({
            templateKey,
            phone: order.customerPhone,
            orderId: order.id,
            paymentMethod: order.paymentMethod,
            orderNumber: String(order.orderNumber),
            customerName: customer?.name ?? null,
            items: snapshotItems,
            grandTotalBsCents: order.grandTotalBsCents,
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
          logger.error("WhatsApp Error in updateOrderStatusAction", { error: String(err), orderId: parsedInput.orderId });
        }
      });
    }

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");
    return { success: true };
  });


