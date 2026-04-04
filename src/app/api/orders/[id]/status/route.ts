import { NextResponse } from "next/server";
import { getOrderStatus } from "@/db/queries/orders";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import * as v from "valibot";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getIP(req);
  const { success } = await rateLimiters.orderStatus.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;

  if (!v.safeParse(v.pipe(v.string(), v.uuid()), id).success) {
    return NextResponse.json({ error: "ID de orden inválido" }, { status: 400 });
  }

  try {
    const result = await getOrderStatus(id);

    if (!result) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: result.status });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
