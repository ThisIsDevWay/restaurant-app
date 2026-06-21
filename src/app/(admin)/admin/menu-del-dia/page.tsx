import { getMenuWithOptionsAndComponents } from "@/db/queries/menu";
import {
  getDailyMenuItemIds,
  getDailyAdicionalIds,
  getDailyBebidaIds,
  getDailyContornoIds,
  getDailyPlatoDelDiaItemId,
} from "@/db/queries/daily-menu";
import { getAllAdicionales } from "@/db/queries/adicionales";
import { getAllBebidas } from "@/db/queries/bebidas";
import { getAllContornos } from "@/db/queries/contornos";
import { DailyMenuClient } from "./DailyMenuClient";
import { todayCaracas } from "@/lib/utils/date";
import { getMenuTemplates } from "@/db/queries/menu-templates";

export const dynamic = "force-dynamic";

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
    platoDelDiaItemId,
    templates,
  ] = await Promise.all([
    getMenuWithOptionsAndComponents(),
    getDailyMenuItemIds(selectedDate),
    getAllAdicionales(),
    getDailyAdicionalIds(selectedDate),
    getAllBebidas(),
    getDailyBebidaIds(selectedDate),
    getAllContornos(),
    getDailyContornoIds(selectedDate),
    getDailyPlatoDelDiaItemId(selectedDate),
    getMenuTemplates(),
  ]);

  const isNewDay = dailyItemIds.length === 0;
  const isNewDaySugerido = isNewDay;
  const initialDailyItemIds = isNewDay
    ? allItems.filter((item) => item.defaultActive).map((item) => item.id)
    : dailyItemIds;

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
          defaultActive: item.defaultActive ?? false,
          isHighRisk: false, // Resolved asynchronously on client
          includedNote: item.includedNote,
          contornos: item.contornos.map((c: any) => ({
            id: c.id,
            name: c.name,
            removable: c.removable,
            substituteContornoIds: c.substituteContornoIds,
          })),
        }))}
      dailyItemIds={initialDailyItemIds}
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
        alwaysShowIfAssigned: c.alwaysShowIfAssigned,
      }))}
      dailyContornoIds={dailyContornoIds}
      selectedDate={selectedDate}
      today={today}
      platoDelDiaItemId={platoDelDiaItemId}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        data: t.data as any,
      }))}
      isNewDaySugerido={isNewDaySugerido}
    />
  );
}
