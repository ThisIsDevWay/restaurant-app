import { Suspense } from "react";
import { getDailyMenuWithOptionsAndComponents } from "@/db/queries/daily-menu";
import { getCategories } from "@/db/queries/menu";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { HeaderCartButton } from "./HeaderCartButton";
import { MenuGridSkeleton } from "@/components/client/MenuGridSkeleton";
import { MenuClient } from "./MenuClient";
import { Cart } from "@/components/public/cart/Cart";
import { ActiveOrdersBanner } from "@/components/public/ActiveOrdersBanner";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [dailyMenuData, categories, rateData, allContornos, appSettings] = await Promise.all([
    getDailyMenuWithOptionsAndComponents(),
    getCategories(),
    getActiveRate(),
    getAllContornos(),
    getSettings(),
  ]);
  const { items, dailyAdicionales, dailyBebidas } = dailyMenuData;

  const rate = rateData?.rate ?? null;
  const showRate = rateData && appSettings?.showRateInMenu !== false;
  const availableCategories = categories.filter((c) => c.isAvailable);
  const adicionalesEnabled = appSettings?.adicionalesEnabled ?? true;
  const bebidasEnabled = appSettings?.bebidasEnabled ?? true;
  const maxQuantityPerItem = appSettings?.maxQuantityPerItem ?? 10;

  // Filter categories to only those that have items in today's menu
  const usedCategoryIds = new Set(items.map((i) => i.categoryId));
  const menuCategories = availableCategories.filter((c) =>
    usedCategoryIds.has(c.id),
  );

  // No daily menu configured
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bg-app">
        <header className="sticky top-0 z-30 bg-white shadow-elevated">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="font-display text-2xl font-bold text-primary">G&M</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/mis-pedidos"
                className="flex items-center gap-1 rounded-full bg-bg-app px-3 py-1 text-xs font-medium text-text-muted"
              >
                Pedidos
              </Link>
            </div>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
            <span className="text-4xl">🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-text-main mb-2">
            Menú no disponible
          </h2>
          <p className="text-sm text-text-muted max-w-xs">
            El menú del día aún no ha sido configurado. Vuelve más tarde para
            ver las opciones disponibles.
          </p>
        </div>
        <Cart />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-2xl font-bold text-primary">G&M</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/mis-pedidos"
              className="flex items-center gap-1 rounded-full bg-bg-app px-3 py-1 text-xs font-medium text-text-muted"
            >
              Pedidos
            </Link>
            {showRate && (
              <RatePill rate={rateData.rate} fetchedAt={rateData.fetchedAt} />
            )}
            <HeaderCartButton />
          </div>
        </div>
      </header>

      {/* Active order banner */}
      <ActiveOrdersBanner />

      {/* Categories + Menu */}
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
          maxQuantityPerItem={maxQuantityPerItem}
        />
      </Suspense>

      {/* Cart bottom bar + drawer */}
      <Cart />
    </div>
  );
}

function RatePill({ rate, fetchedAt }: { rate: number; fetchedAt: string }) {
  const formattedRate = rate.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isStale =
    Date.now() - new Date(fetchedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-bg-app px-3 py-1 text-xs font-medium">
      <span
        title={isStale ? "Tasa del día anterior" : undefined}
        className={`h-2 w-2 animate-pulse-dot rounded-full ${isStale ? "bg-amber" : "bg-success"}`}
      />
      <span className="text-text-muted">BCV</span>
      <span className="font-semibold text-text-main">Bs. {formattedRate}</span>
    </div>
  );
}
