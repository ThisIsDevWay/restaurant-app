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
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { status: "disconnected", error: "Error al conectar con microservicio" },
      { status: 500 },
    );
  }
}
