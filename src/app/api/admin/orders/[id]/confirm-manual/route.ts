import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getProviderById } from "@/lib/payment-providers";
import { getCustomerByPhone } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import { printReceipt } from "@/lib/print/enqueue";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { logger } from "@/lib/logger";
import * as v from "valibot";

const paramsSchema = v.object({
  id: v.pipe(v.string(), v.uuid("ID de orden inválido")),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.role || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Validar parámetros de ruta
  const paramsResult = v.safeParse(paramsSchema, await params);
  if (!paramsResult.success) {
    return NextResponse.json(
      { error: paramsResult.issues[0].message },
      { status: 400 },
    );
  }
  const { id: orderId } = paramsResult.output;

  try {
    const body = await req.json().catch(() => ({}));
    const paymentReference = body?.paymentReference ? String(body.paymentReference).trim() : undefined;

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const settings = await getSettings();
    if (!settings) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 500 },
      );
    }

    // Usar el provider que se guardó en la orden, no el activo actual.
    // Esto evita fallos si el admin cambió el proveedor entre checkout y confirmación.
    const provider = getProviderById(order.paymentProvider, settings);

    const result = await provider.confirmPayment({
      type: "manual",
      adminUserId: session.user.id!,
      orderId,
    });

    if (result.success) {
      if (paymentReference) {
        const { db: database } = await import("@/db");
        const { orders: ordersTable, paymentsLog: paymentsLogTable } = await import("@/db/schema");
        const { eq: equalTo } = await import("drizzle-orm");

        await database
          .update(ordersTable)
          .set({ paymentReference })
          .where(equalTo(ordersTable.id, orderId));

        await database
          .update(paymentsLogTable)
          .set({ reference: paymentReference })
          .where(equalTo(paymentsLogTable.orderId, orderId));
      }

      const customer = await getCustomerByPhone(order.customerPhone);
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
      }).catch((err) => {
        logger.error("WhatsApp Error:", { error: String(err) });
      });

      // Imprimir el recibo de caja con la orden ACTUALIZADA (estado paid) —
      // releer para no usar el snapshot pre-pago.
      const paidOrder = await getOrderById(orderId);
      await printReceipt(paidOrder ?? order).catch((err) => {
        logger.error("Print error (recibo confirm-manual)", { error: String(err), orderId });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      reason: result.reason,
      message: result.message,
    });
  } catch (err) {
    logger.error("Failed manual confirmation", { error: String(err), orderId });
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
