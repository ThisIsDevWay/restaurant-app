import { NextResponse } from "next/server";
import { getOrderById } from "@/db/queries/orders";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { confirmPayment } from "@/services/payment.service";
import * as v from "valibot";

const confirmSchema = v.object({
  orderId: v.pipe(v.string(), v.uuid()),
  reference: v.pipe(v.string(), v.minLength(1)),
});

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = getIP(req);
    const { success: rateOk } = await rateLimiters.checkout.limit(ip);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = v.safeParse(confirmSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos" },
        { status: 400 },
      );
    }

    const { orderId, reference } = parsed.output;

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    const result = await confirmPayment(orderId, reference);

    if (result.success) {
      return NextResponse.json({
        success: true,
        reference: result.reference,
      });
    }

    return NextResponse.json({
      success: false,
      reason: result.reason,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error interno del servidor" },
      { status: err.message?.includes("Configuración") || err.message?.includes("provider") ? 400 : 500 },
    );
  }
}
