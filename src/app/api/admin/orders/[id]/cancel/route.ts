import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById, updateOrderStatus } from "@/db/queries/orders";

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

    return NextResponse.json({ success: true, status: "cancelled" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
