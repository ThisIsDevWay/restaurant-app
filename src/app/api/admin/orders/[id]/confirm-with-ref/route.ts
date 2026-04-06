import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById, updateOrderStatus } from "@/db/queries/orders";
import { upsertCustomer } from "@/db/queries/customers";
import { getSettings } from "@/db/queries/settings";
import { sendOrderMessage } from "@/lib/whatsapp/messages";
import type { SnapshotItem } from "@/lib/utils/format-items-detailed";
import { logger } from "@/lib/logger";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "admin") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id: orderId } = await params;

    try {
        const body = await req.json();
        const { paymentReference, phone, customerName, cedula } = body as {
            paymentReference?: string;
            phone?: string;
            customerName?: string;
            cedula?: string;
        };

        if (!paymentReference || paymentReference.trim().length < 3) {
            return NextResponse.json(
                { error: "Se requiere un número de referencia válido (mínimo 3 caracteres)" },
                { status: 400 },
            );
        }

        if (!phone || phone.trim().length < 7) {
            return NextResponse.json(
                { error: "Se requiere un número de teléfono válido (mínimo 7 dígitos)" },
                { status: 400 },
            );
        }

        const order = await getOrderById(orderId);
        if (!order) {
            return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
        }

        if (order.status !== "pending") {
            return NextResponse.json(
                { error: `Solo se puede confirmar con referencia desde estado pendiente. Estado actual: ${order.status}` },
                { status: 400 },
            );
        }

        // Upsert customer with the phone they paid from (may be different from order.customerPhone)
        const customer = await upsertCustomer(
            phone.trim(),
            customerName?.trim() || null,
            cedula?.trim() || null,
        );

        await updateOrderStatus(orderId, "paid", undefined, paymentReference.trim());

        const settings = await getSettings();
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
            baseUrl: settings?.whatsappMicroserviceUrl,
        }).catch((err) => {
            logger.error("WhatsApp Error al confirmar con referencia", { error: String(err) });
        });

        return NextResponse.json({ success: true, status: "paid" });
    } catch {
        return NextResponse.json(
            { success: false, error: "Error interno del servidor" },
            { status: 500 },
        );
    }
}
