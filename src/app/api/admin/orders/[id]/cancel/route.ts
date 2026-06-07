import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById, updateOrderStatus } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getCustomerByPhone } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { logger } from "@/lib/logger";
import * as v from "valibot";

const paramsSchema = v.object({
  id: v.pipe(v.string(), v.uuid("ID de orden inválido")),
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
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
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    if (order.status !== "pending" && order.status !== "whatsapp") {
      return NextResponse.json(
        {
          error: `No se puede cancelar una orden en estado: ${order.status}`,
        },
        { status: 400 },
      );
    }

    await updateOrderStatus(orderId, "cancelled");

    // Enviar notificación al cliente de cancelación
    const [customer, settings] = await Promise.all([
      getCustomerByPhone(order.customerPhone),
      getSettings(),
    ]);

    const snapshotItems = order.itemsSnapshot as SnapshotItem[];
    const surchargesSnapshot = order.surchargesSnapshot as {
      packagingUsdCents: number;
      deliveryUsdCents: number;
      orderMode: string;
    } | null;
    const rate = parseFloat(order.rateSnapshotBsPerUsd);

    await sendOrderMessage({
      templateKey: "cancelled",
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
      baseUrl: settings?.whatsappMicroserviceUrl,
    }).catch((err) => {
      logger.error("WhatsApp Error al notificar cancelación", { error: String(err), orderId });
    });

    return NextResponse.json({ success: true, status: "cancelled" });
  } catch (err) {
    logger.error("Failed to cancel order", { error: String(err), orderId });
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
