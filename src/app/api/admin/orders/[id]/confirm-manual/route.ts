import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider } from "@/lib/payment-providers";

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
