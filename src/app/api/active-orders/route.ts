import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKitchenOrdersSimple } from "@/db/queries/orders";

// Órdenes activas del día para los paneles de /waiter y /caja.
// Incluye pendientes (pedidos sin cobrar) — por eso no se reutiliza /api/kitchen-orders.
export async function GET() {
  const session = await auth();
  if (
    !session?.user?.role ||
    !["admin", "waiter", "cashier"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(now);
    const dateMap: Record<string, string> = {};
    parts.forEach((p) => (dateMap[p.type] = p.value));

    const caracasStart = new Date(
      `${dateMap.year}-${dateMap.month.padStart(2, "0")}-${dateMap.day.padStart(2, "0")}T00:00:00-04:00`,
    );

    const orders = await getKitchenOrdersSimple(caracasStart, true);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
