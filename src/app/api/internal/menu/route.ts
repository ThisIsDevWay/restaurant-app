import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDailyMenuWithOptionsAndComponentsFresh } from "@/db/queries/daily-menu";
import { getCategories } from "@/db/queries/menu";
import { getSettingsFresh } from "@/db/queries/settings";

export const revalidate = 0; // always fresh — POS structural refetch

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["admin", "waiter", "cashier"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [dailyMenuData, categories, settings] = await Promise.all([
      getDailyMenuWithOptionsAndComponentsFresh().catch(() => ({
        items: [],
        dailyAdicionales: [],
        dailyBebidas: [],
        dailyContornos: [],
      })),
      getCategories().catch(() => []),
      getSettingsFresh().catch(() => null),
    ]);

    return NextResponse.json(
      {
        items: dailyMenuData.items,
        categories: categories.filter((c) => c.isAvailable),
        dailyAdicionales: dailyMenuData.dailyAdicionales,
        dailyBebidas: dailyMenuData.dailyBebidas,
        allContornos: dailyMenuData.dailyContornos ?? [],
        settings,
        ts: Date.now(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}
