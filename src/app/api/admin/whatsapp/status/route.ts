import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStatus } from "@/lib/whatsapp/client";
import { getSettings } from "@/db/queries/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const settings = await getSettings();
    const status = await getStatus(settings?.whatsappMicroserviceUrl);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { status: "disconnected", error: "Error al conectar con microservicio" },
      { status: 500 },
    );
  }
}
