import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { confirmPayment } from "@/services/payment.service";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { logger } from "@/lib/logger";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import * as v from "valibot";
import { printReceipt } from "@/lib/print/enqueue";

const confirmSchema = v.object({
  orderId: v.pipe(v.string(), v.uuid()),
  reference: v.pipe(v.string(), v.minLength(1)),
  checkoutToken: v.pipe(v.string(), v.uuid()),
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

    const { orderId, reference, checkoutToken } = parsed.output;

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    // Reject expired orders — prevents using a stale token to confirm a timed-out order.
    const expirationToleranceMs = 10 * 60 * 1000;
    const isExpired = order.expiresAt.getTime() + expirationToleranceMs < Date.now();
    if (isExpired) {
      return NextResponse.json(
        { success: false, error: "Orden expirada" },
        { status: 410 },
      );
    }

    // Verify the caller owns this order — compare tokens with constant-time equality
    // to prevent timing attacks. Reject if token is missing (already-paid orders have null token).
    if (!order.checkoutToken) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
    }
    const bufA = Buffer.from(checkoutToken, "utf8");
    const bufB = Buffer.from(order.checkoutToken, "utf8");
    if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
    }

    const result = await confirmPayment(orderId, reference);

    if (result.success) {
      // Enviar "received" aquí — solo después de verificación exitosa del pago.
      // El checkout.ts ya NO envía este mensaje para proveedores de conciliación automática.
      const settings = await getSettings();
      const isAlreadyPaid = !!(
        result.providerRaw &&
        typeof result.providerRaw === "object" &&
        "alreadyPaid" in result.providerRaw &&
        (result.providerRaw as any).alreadyPaid === true
      );

      const isAutoNotificationProvider =
        order.paymentProvider === "local_notifications" ||
        order.paymentProvider === "pabilo_notifications";

      if (settings && !isAlreadyPaid && !isAutoNotificationProvider) {
        const snapshotItems = order.itemsSnapshot as SnapshotItem[];
        const surchargesSnapshot = order.surchargesSnapshot as {
          packagingUsdCents: number;
          deliveryUsdCents: number;
          orderMode: string;
        } | null;
        const rate = parseFloat(order.rateSnapshotBsPerUsd);

        await sendOrderMessage({
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

      // Imprimir recibo de caja para confirmaciones de pago automáticas/cliente (evitando duplicar para local/pabilo)
      if (!isAutoNotificationProvider) {
        const paidOrder = await getOrderById(orderId);
        await printReceipt(paidOrder ?? order).catch((err) => {
          logger.error("Print error (recibo payment-confirm)", { error: String(err), orderId });
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

