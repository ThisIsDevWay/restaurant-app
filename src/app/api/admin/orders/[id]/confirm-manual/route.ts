import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider } from "@/lib/payment-providers";
import { getCustomerByPhone } from "@/db/queries/customers";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id: orderId } = await params;

  try {
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

    const provider = getActiveProvider(settings);

    const result = await provider.confirmPayment({
      type: "manual",
      adminUserId: session.user.id!,
      orderId,
    });

    if (result.success) {
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
        console.error("WhatsApp Error:", err);
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      reason: result.reason,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
