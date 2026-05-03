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
    // Calculate start of day in America/Caracas
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(now);
    const dateMap: Record<string, string> = {};
    parts.forEach((p) => (dateMap[p.type] = p.value));

    // Create a date object for 00:00:00 of today in Caracas time
    // We can use the date string and parse it as Caracas time
    const caracasStart = new Date(
      `${dateMap.year}-${dateMap.month.padStart(2, "0")}-${dateMap.day.padStart(2, "0")}T00:00:00-04:00`,
    );

    const orders = await getKitchenOrdersSimple(caracasStart);
    return NextResponse.json(orders);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
