import { getMenuWithOptionsAndComponents } from "@/db/queries/menu";
import {
  getDailyMenuItemIds,
  getDailyAdicionalIds,
  getDailyBebidaIds,
  getDailyContornoIds,
} from "@/db/queries/daily-menu";
import { getAllAdicionales } from "@/db/queries/adicionales";
import { getAllBebidas } from "@/db/queries/bebidas";
import { getAllContornos } from "@/db/queries/contornos";
import { DailyMenuClient } from "./DailyMenuClient";
import { todayCaracas } from "@/lib/utils/date";

export default async function DailyMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = todayCaracas();
  const selectedDate = params.date ?? today;

  const [
    allItems,
    dailyItemIds,
    allAdicionales,
    dailyAdicionalIds,
    allBebidas,
    dailyBebidaIds,
    allContornos,
    dailyContornoIds,
  ] = await Promise.all([
    getMenuWithOptionsAndComponents(),
    getDailyMenuItemIds(selectedDate),
    getAllAdicionales(),
    getDailyAdicionalIds(selectedDate),
    getAllBebidas(),
    getDailyBebidaIds(selectedDate),
    getAllContornos(),
    getDailyContornoIds(selectedDate),
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
          contornos: item.contornos.map((c: any) => ({
            id: c.id,
            name: c.name,
            removable: c.removable,
            substituteContornoIds: c.substituteContornoIds,
          })),
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
      allContornos={allContornos.map((c) => ({
        id: c.id,
        name: c.name,
        priceUsdCents: c.priceUsdCents,
        isAvailable: c.isAvailable,
      }))}
      dailyContornoIds={dailyContornoIds}
      selectedDate={selectedDate}
      today={today}
    />
  );
}
