import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderById, updateOrderStatus } from "@/db/queries/orders";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  whatsapp: ["paid", "cancelled"],
  paid: ["kitchen"],
  kitchen: ["delivered"],
};

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
    const body = await _req.json();
    const { status: newStatus } = body as { status: string };

    if (!newStatus) {
      return NextResponse.json(
        { error: "Estado requerido" },
        { status: 400 },
      );
    }

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

    await updateOrderStatus(
      orderId,
      newStatus as "pending" | "paid" | "kitchen" | "delivered" | "expired" | "failed" | "whatsapp",
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
