import { getMenuWithOptions } from "@/db/queries/menu";
import {
  getDailyMenuItemIds,
  getDailyAdicionalIds,
  getDailyBebidaIds,
} from "@/db/queries/daily-menu";
import { getAllAdicionales } from "@/db/queries/adicionales";
import { getAllBebidas } from "@/db/queries/bebidas";
import { DailyMenuClient } from "./DailyMenuClient";

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function DailyMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = formatLocalDate(new Date());
  const selectedDate = params.date ?? today;

  const [allItems, dailyItemIds, allAdicionales, dailyAdicionalIds, allBebidas, dailyBebidaIds] =
    await Promise.all([
      getMenuWithOptions(),
      getDailyMenuItemIds(selectedDate),
      getAllAdicionales(),
      getDailyAdicionalIds(selectedDate),
      getAllBebidas(),
      getDailyBebidaIds(selectedDate),
    ]);

  return (
    <DailyMenuClient
      allItems={allItems
        .filter((item) => !item.categoryIsSimple)
        .map((item) => ({
          id: item.id,
          name: item.name,
          categoryName: item.categoryName,
          priceUsdCents: item.priceUsdCents,
          imageUrl: item.imageUrl,
        }))}
      dailyItemIds={dailyItemIds}
      allAdicionales={allAdicionales.map((a) => ({
        id: a.id,
        name: a.name,
        priceUsdCents: a.priceUsdCents,
        isAvailable: a.isAvailable,
      }))}
      dailyAdicionalIds={dailyAdicionalIds}
      allBebidas={allBebidas.map((b) => ({
        id: b.id,
        name: b.name,
        priceUsdCents: b.priceUsdCents,
        isAvailable: b.isAvailable,
      }))}
      dailyBebidaIds={dailyBebidaIds}
      selectedDate={selectedDate}
      today={today}
    />
  );
}
