import { NextResponse } from "next/server";
import { getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { confirmPayment } from "@/services/payment.service";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { logger } from "@/lib/logger";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import * as v from "valibot";

const confirmSchema = v.object({
  orderId: v.pipe(v.string(), v.uuid()),
  reference: v.pipe(v.string(), v.minLength(1)),
});

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = getIP(req);
    const { success: rateOk } = await rateLimiters.checkout.limit(ip);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = v.safeParse(confirmSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos" },
        { status: 400 },
      );
    }

    const { orderId, reference } = parsed.output;

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    const result = await confirmPayment(orderId, reference);

    if (result.success) {
      // Enviar "received" aquí — solo después de verificación exitosa del pago.
      // El checkout.ts ya NO envía este mensaje para proveedores de conciliación automática.
      const settings = await getSettings();
      if (settings) {
        const snapshotItems = order.itemsSnapshot as SnapshotItem[];
        const surchargesSnapshot = order.surchargesSnapshot as {
          packagingUsdCents: number;
          deliveryUsdCents: number;
          orderMode: string;
        } | null;
        const rate = parseFloat(order.rateSnapshotBsPerUsd);

        sendOrderMessage({
          templateKey: "paid",
          phone: order.customerPhone,
          orderId: order.id,
          paymentMethod: order.paymentMethod,
          orderNumber: String(order.orderNumber),
          customerName: null,
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
        }).catch((err) => {
          logger.error("WhatsApp Error en payment-confirm", { error: String(err) });
        });
      }

      return NextResponse.json({
        success: true,
        reference: result.reference,
      });
    }

    return NextResponse.json({
      success: false,
      reason: result.reason,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error interno del servidor" },
      { status: err.message?.includes("Configuración") || err.message?.includes("provider") ? 400 : 500 },
    );
  }
}

