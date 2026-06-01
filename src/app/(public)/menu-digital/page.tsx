export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getDailyMenuWithOptionsAndComponents } from "@/db/queries/daily-menu";
import { getCategories } from "@/db/queries/menu";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { isMenuVisible, type StatusOverride } from "@/lib/utils/date";
import { MenuGridSkeleton } from "@/components/customer/MenuGridSkeleton";
import { MenuClient } from "../MenuClient";
import Link from "next/link";

export default async function MenuDigitalPage() {
  try {
    // Ola 1: data base crítica para el renderizado inicial
    const [dailyMenuData, categories] = await Promise.all([
      getDailyMenuWithOptionsAndComponents().catch((err) => {
        console.error("[MenuDigitalPage] dailyMenu query failed:", err);
        return { items: [], dailyAdicionales: [], dailyBebidas: [], dailyContornos: [] };
      }),
      getCategories().catch((err) => {
        console.error("[MenuDigitalPage] categories query failed:", err);
        return [] as Awaited<ReturnType<typeof getCategories>>;
      }),
    ]);

    const items = dailyMenuData?.items ?? [];
    const dailyAdicionales = dailyMenuData?.dailyAdicionales ?? [];
    const dailyBebidas = dailyMenuData?.dailyBebidas ?? [];
    const dailyContornos = dailyMenuData?.dailyContornos ?? [];

    // Ola 2: data complementaria con fallback individual para resiliencia
    const [rateData, allContornos, appSettings] = await Promise.all([
      getActiveRate().catch((err) => {
        console.error("[MenuDigitalPage] rate query failed:", err);
        return null;
      }),
      getAllContornos().catch((err) => {
        console.error("[MenuDigitalPage] contornos query failed:", err);
        return [] as Awaited<ReturnType<typeof getAllContornos>>;
      }),
      getSettings().catch((err) => {
        console.error("[MenuDigitalPage] settings query failed:", err);
        return null;
      }),
    ]);

    const rate = rateData?.rate ?? null;
    const showRate = rateData && appSettings?.showRateInMenu !== false && rateData.currency !== "eur";
    const availableCategories = (categories ?? []).filter((c) => c.isAvailable);
    const adicionalesEnabled = appSettings?.adicionalesEnabled ?? true;
    const bebidasEnabled = appSettings?.bebidasEnabled ?? true;
    const maxQuantityPerItem = appSettings?.maxQuantityPerItem ?? 10;

    // Open/closed gating (computed in Caracas time on the server for the initial paint)
    const businessHours = appSettings?.businessHours ?? null;
    const statusOverride = (appSettings?.statusOverride ?? "auto") as StatusOverride;
    const hideMenuWhenClosed = appSettings?.hideMenuWhenClosed ?? false;
    const preOpenVisibilityMinutes = appSettings?.preOpenVisibilityMinutes ?? 0;
    const initialVisible = isMenuVisible(businessHours, {
      hideWhenClosed: hideMenuWhenClosed,
      preOpenMinutes: preOpenVisibilityMinutes,
      statusOverride,
    });

    // Filter categories to only those that have items in today's menu
    const usedCategoryIds = new Set(items.map((i) => i.categoryId));
    const menuCategories = availableCategories.filter((c) =>
      usedCategoryIds.has(c.id),
    );

    return (
      <div className="min-h-screen bg-bg-app">
        {/* Categories + Menu — isReadOnly={true} disables ordering features */}
        <Suspense fallback={<MenuGridSkeleton />}>
          <MenuClient
            items={items}
            categories={menuCategories}
            rate={rate}
            allContornos={allContornos}
            adicionalesEnabled={adicionalesEnabled}
            bebidasEnabled={bebidasEnabled}
            dailyAdicionales={dailyAdicionales}
            dailyBebidas={dailyBebidas}
            dailyContornos={dailyContornos}
            maxQuantityPerItem={maxQuantityPerItem}
            menuLayout={appSettings?.menuLayout as "modern" | "classic" | undefined}
            coverImageUrl={appSettings?.coverImageUrl}
            logoUrl={appSettings?.logoUrl}
            restaurantName={appSettings?.restaurantName}
            branchName={appSettings?.branchName}
            scheduleText={appSettings?.scheduleText}
            businessHours={businessHours}
            statusOverride={statusOverride}
            hideMenuWhenClosed={hideMenuWhenClosed}
            preOpenVisibilityMinutes={preOpenVisibilityMinutes}
            initialVisible={initialVisible}
            instagramUrl={appSettings?.instagramUrl}
            showRate={!!showRate}
            rateData={rateData}
            isReadOnly={true}
            isPrivate={false}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Error loading menu-digital page:", error);
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-elevated max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error al cargar la carta digital</h2>
          <p className="text-text-muted text-sm mb-6">
            Estamos experimentando problemas técnicos. Por favor, intenta de nuevo en unos minutos.
          </p>
          <Link
            href="/menu-digital"
            className="block w-full bg-primary text-white py-2 rounded-lg font-medium text-center"
          >
            Reintentar
          </Link>
        </div>
      </div>
    );
  }
}
