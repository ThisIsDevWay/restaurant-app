import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStatus } from "@/lib/whatsapp/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const status = await getStatus();
    return NextResponse.json({ qr: status.qr ?? null });
  } catch {
    return NextResponse.json(
      { qr: null, error: "Error al obtener QR" },
      { status: 500 },
    );
  }
}
