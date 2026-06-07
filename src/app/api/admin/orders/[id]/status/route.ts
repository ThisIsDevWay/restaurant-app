import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById, updateOrderStatus } from "@/db/queries/orders";
import { getCustomerByPhone } from "@/db/queries/customers";
import { getSettings } from "@/db/queries/settings";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { logger } from "@/lib/logger";
import * as v from "valibot";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  whatsapp: ["paid", "cancelled"],
  paid: ["kitchen"],
  kitchen: ["delivered"],
};

const STATUS_TO_TEMPLATE: Record<string, string> = {
  paid: "paid",
  kitchen: "kitchen",
  delivered: "delivered",
};

const paramsSchema = v.object({
  id: v.pipe(v.string(), v.uuid("ID de orden inválido")),
});

const statusBodySchema = v.object({
  status: v.picklist(
    ["pending", "paid", "kitchen", "delivered", "expired", "failed", "whatsapp", "cancelled"] as const,
    "Estado de orden inválido"
  ),
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Validar parámetros
  const paramsResult = v.safeParse(paramsSchema, await params);
  if (!paramsResult.success) {
    return NextResponse.json(
      { error: paramsResult.issues[0].message },
      { status: 400 },
    );
  }
  const { id: orderId } = paramsResult.output;

  try {
    const body = await _req.json();
    const bodyResult = v.safeParse(statusBodySchema, body);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.issues[0].message },
        { status: 400 },
      );
    }
    const { status: newStatus } = bodyResult.output;

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Transición no válida: ${order.status} → ${newStatus}`,
        },
        { status: 400 },
      );
    }

    await updateOrderStatus(orderId, newStatus);

    const templateKey = STATUS_TO_TEMPLATE[newStatus];
    if (templateKey) {
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
        baseUrl: settings?.whatsappMicroserviceUrl,
      }).catch((err) => {
        logger.error("WhatsApp Error", { error: String(err) });
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    logger.error("Failed to update status", { error: String(err), orderId });
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
