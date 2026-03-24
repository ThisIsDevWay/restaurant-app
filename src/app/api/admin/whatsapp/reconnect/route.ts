import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forceReconnect } from "@/lib/whatsapp/client";
import { getSettings } from "@/db/queries/settings";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const settings = await getSettings();
    const success = await forceReconnect(settings?.whatsappMicroserviceUrl);
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
