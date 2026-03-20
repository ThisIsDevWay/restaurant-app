import { NextResponse } from "next/server";
import { getSettings } from "@/db/queries/settings";
import { getOrderById } from "@/db/queries/orders";
import { getActiveProvider } from "@/lib/payment-providers";
import * as v from "valibot";

const confirmSchema = v.object({
  orderId: v.pipe(v.string(), v.uuid()),
  reference: v.pipe(v.string(), v.minLength(1)),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = v.safeParse(confirmSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos" },
        { status: 400 },
      );
    }

    const { orderId, reference } = parsed.output;

    const settings = await getSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Configuración no encontrada" },
        { status: 500 },
      );
    }

    const provider = getActiveProvider(settings);

    if (provider.mode !== "active") {
      return NextResponse.json(
        { success: false, error: "Este provider no acepta confirmaciones manuales" },
        { status: 400 },
      );
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    const result = await provider.confirmPayment({
      type: "reference",
      reference,
      orderId,
    });

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
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
