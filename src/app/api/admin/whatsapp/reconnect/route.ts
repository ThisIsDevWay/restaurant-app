import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forceReconnect } from "@/lib/whatsapp/client";

export async function POST() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const success = await forceReconnect();
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: "No se pudo forzar reconexión" },
      { status: 500 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Error al conectar con microservicio" },
      { status: 500 },
    );
  }
}
