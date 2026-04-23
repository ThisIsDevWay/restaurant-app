import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyMenuItems, dailyAdicionales, dailyBebidas, dailyContornos, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayCaracas } from "@/lib/utils/date";

export const revalidate = 0; // Fresh data

export async function GET() {
  const today = todayCaracas();

  try {
    const [platos, adicionales, bebidas, contornos] = await Promise.all([
      db.select({ id: dailyMenuItems.menuItemId, name: menuItems.name, isAvailable: dailyMenuItems.isAvailable })
        .from(dailyMenuItems)
        .innerJoin(menuItems, eq(dailyMenuItems.menuItemId, menuItems.id))
        .where(eq(dailyMenuItems.date, today)),
      db.select({ id: dailyAdicionales.adicionalItemId, name: menuItems.name, isAvailable: dailyAdicionales.isAvailable })
        .from(dailyAdicionales)
        .innerJoin(menuItems, eq(dailyAdicionales.adicionalItemId, menuItems.id))
        .where(eq(dailyAdicionales.date, today)),
      db.select({ id: dailyBebidas.bebidaItemId, name: menuItems.name, isAvailable: dailyBebidas.isAvailable })
        .from(dailyBebidas)
        .innerJoin(menuItems, eq(dailyBebidas.bebidaItemId, menuItems.id))
        .where(eq(dailyBebidas.date, today)),
      db.select({ id: dailyContornos.contornoItemId, name: menuItems.name, isAvailable: dailyContornos.isAvailable })
        .from(dailyContornos)
        .innerJoin(menuItems, eq(dailyContornos.contornoItemId, menuItems.id))
        .where(eq(dailyContornos.date, today)),
    ]);

    return NextResponse.json(
      { platos, adicionales, bebidas, contornos, ts: Date.now() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
