import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { todayCaracas } from "@/lib/utils/date";
import { getDishSelloutRisk } from "@/db/queries/reports";

/**
 * Riesgo de "86" por plato — alimenta las alertas del QuickAvailabilityPanel.
 * Ventana: últimos 60 días. Umbral de alerta (en el cliente): pctDaysBefore13 >= 8.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const toDate = todayCaracas();
    const ref = new Date(`${toDate}T00:00:00-04:00`);
    ref.setDate(ref.getDate() - 60);
    const fromDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
    }).format(ref);

    const rows = await getDishSelloutRisk(fromDate, toDate, 30);

    const riskMap: Record<string, number> = {};
    for (const row of rows) {
      riskMap[row.itemId] = row.pctDaysBefore13;
    }

    return NextResponse.json({ riskMap });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
