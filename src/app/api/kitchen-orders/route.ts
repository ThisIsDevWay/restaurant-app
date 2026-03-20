import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKitchenOrdersSimple } from "@/db/queries/orders";

export async function GET() {
  const session = await auth();
  if (
    !session?.user?.role ||
    !["admin", "kitchen"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await getKitchenOrdersSimple();
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
