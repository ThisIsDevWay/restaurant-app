import { Suspense } from "react";
import { getMenuWithOptionsAndComponents, getCategories } from "@/db/queries/menu";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { HeaderCartButton } from "./HeaderCartButton";
import { MenuGridSkeleton } from "@/components/client/MenuGridSkeleton";
import { MenuClient } from "./MenuClient";
import { Cart } from "@/components/public/cart/Cart";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [items, categories, rateData, allContornos, appSettings] = await Promise.all([
    getMenuWithOptionsAndComponents(),
    getCategories(),
    getActiveRate(),
    getAllContornos(),
    getSettings(),
  ]);

  const rate = rateData?.rate ?? null;
  const showRate = rateData && appSettings?.showRateInMenu !== false;
  const availableCategories = categories.filter((c) => c.isAvailable);

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-2xl font-bold text-primary">G&M</h1>
          <div className="flex items-center gap-2">
            {showRate && (
              <RatePill rate={rateData.rate} fetchedAt={rateData.fetchedAt} />
            )}
            <HeaderCartButton />
          </div>
        </div>
      </header>

      {/* Categories + Menu */}
      <Suspense fallback={<MenuGridSkeleton />}>
        <MenuClient items={items} categories={availableCategories} rate={rate} allContornos={allContornos} />
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
