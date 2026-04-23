"use client";

import { useState } from "react";
import { MenuItemCard } from "./MenuItemCard";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";

interface ContornoOption {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface SimpleItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface MenuGridProps {
  items: MenuItem[];
  rate: number | null;
  allContornos: ContornoOption[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  maxQuantityPerItem?: number;
  menuLayout?: "modern" | "classic";
  availabilityMap?: Map<string, boolean>;
}

export function MenuGrid({
  items,
  rate,
  allContornos,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
  maxQuantityPerItem = 10,
  menuLayout = "modern",
  availabilityMap = new Map(),
}: MenuGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [drinkWarningItem, setDrinkWarningItem] = useState<{ payload: any; categoryName: string } | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  // Mapear items con disponibilidad en tiempo real
  const mappedItems = items.map(item => ({
    ...item,
    isAvailable: availabilityMap.has(item.id) ? availabilityMap.get(item.id)! : item.isAvailable,
    adicionales: item.adicionales.map(a => ({
      ...a,
      isAvailable: availabilityMap.has(a.id) ? availabilityMap.get(a.id)! : a.isAvailable
    })),
    bebidas: item.bebidas.map(b => ({
      ...b,
      isAvailable: availabilityMap.has(b.id) ? availabilityMap.get(b.id)! : b.isAvailable
    })),
    contornos: item.contornos.map(c => ({
      ...c,
      isAvailable: availabilityMap.has(c.id) ? availabilityMap.get(c.id)! : c.isAvailable
    }))
  }));

  // Mapear componentes diarios
  const mappedDailyAdicionales = dailyAdicionales.map(a => ({
    ...a,
    isAvailable: availabilityMap.has(a.id) ? availabilityMap.get(a.id)! : a.isAvailable
  }));

  const mappedDailyBebidas = dailyBebidas.map(b => ({
    ...b,
    isAvailable: availabilityMap.has(b.id) ? availabilityMap.get(b.id)! : b.isAvailable
  }));

  const availableItems = mappedItems.filter((i) => i.isAvailable);
  const unavailableItems = mappedItems.filter((i) => !i.isAvailable);
  const sortedItems = [...availableItems, ...unavailableItems];

  const selectedItem = selectedItemId
    ? mappedItems.find((i) => i.id === selectedItemId) ?? null
    : null;

  const handleAddSimpleItem = (payload: any, categoryName: string) => {
    const isDrink = categoryName.toLowerCase().includes("bebida");
    const hasDrinkInCart = cartItems.some(
      (i) =>
        (i.selectedBebidas && i.selectedBebidas.length > 0) ||
        i.emoji === "🥤"
    );

    if (isDrink && hasDrinkInCart) {
      setDrinkWarningItem({ payload, categoryName });
    } else {
      addItem(payload);
      toast.success(`${payload.name} añadido al carrito`);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
  };

  const confirmAddDrink = () => {
    if (drinkWarningItem) {
      addItem(drinkWarningItem.payload);
      toast.success(`${drinkWarningItem.payload.name} añadido al carrito`);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
      setDrinkWarningItem(null);
    }
  };

  /*
    ── Grid layout strategy ─────────────────────────────────────────────────────

    MODERN layout (tall cards, rich imagery):
      Mobile:  1 col
      Tablet:  2 col  (md)
      Desktop: 2 col  (lg)  — intentionally kept at 2 to preserve card height
      XL:      3 col  (xl)  — opens up at wide screens
      2XL:     4 col  (2xl) — large monitors

    CLASSIC layout (compact grid):
      Mobile:  2 col
      Tablet:  3 col  (md)
      Desktop: 4 col  (lg)
      XL:      5 col  (xl)
      2XL:     6 col  (2xl)
  */
  const gridClasses =
    menuLayout === "classic"
      ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-5 xl:gap-6";

  return (
    <div
      className={`
        w-full max-w-7xl mx-auto
        ${gridClasses}
        px-4 pb-4
        md:px-6 md:pt-4
        lg:px-8 lg:pt-5 lg:pb-8
        xl:px-10
      `}
    >
      {sortedItems.map((item, index) => {
        const hasContornos = item.contornos.some((c) => c.isAvailable);
        const hasRequiredOptions = item.optionGroups.some((g) => g.required);
        const effectiveHasDailyAdicionales =
          adicionalesEnabled && !item.hideAdicionales && mappedDailyAdicionales.length > 0;
        const effectiveHasDailyBebidas =
          bebidasEnabled && !item.hideBebidas && mappedDailyBebidas.length > 0;

        const needsDetailModal =
          !item.categoryIsSimple ||
          hasContornos ||
          hasRequiredOptions ||
          (item.categoryIsSimple
            ? false
            : effectiveHasDailyAdicionales || effectiveHasDailyBebidas);

        const priceBsCents = rate ? Math.round(item.priceUsdCents * rate) : 0;

        return (
          <MenuItemCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            includedNote={item.includedNote ?? null}
            priceUsdCents={item.priceUsdCents}
            priceBsCents={priceBsCents}
            categoryName={item.categoryName}
            categoryAllowAlone={item.categoryAllowAlone}
            isAvailable={item.isAvailable}
            imageUrl={item.imageUrl}
            priority={index < 4}
            hasRequiredOptions={needsDetailModal}
            categoryIsSimple={item.categoryIsSimple}
            onOpenDetail={() => setSelectedItemId(item.id)}
            onAddSimpleItem={handleAddSimpleItem}
            menuLayout={menuLayout}
          />
        );
      })}

      {selectedItem && rate && (
        <ItemDetailModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItemId(null)}
          currentRateBsPerUsd={rate}
          allContornos={allContornos}
          adicionalesEnabled={adicionalesEnabled}
          bebidasEnabled={bebidasEnabled}
          dailyAdicionales={mappedDailyAdicionales}
          dailyBebidas={mappedDailyBebidas}
          maxQuantityPerItem={maxQuantityPerItem}
          menuLayout={menuLayout}
        />
      )}

      <Dialog
        open={!!drinkWarningItem}
        onOpenChange={(open) => {
          if (!open) setDrinkWarningItem(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Agregar bebida adicional?</DialogTitle>
            <DialogDescription>
              Ya tienes una bebida incluida en tu carrito. ¿Deseas añadir esta bebida extra por separado?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              onClick={() => setDrinkWarningItem(null)}
              className="w-full rounded-input border border-border bg-white py-2.5 text-[15px] font-medium text-text-main transition-colors active:bg-bg-app sm:w-auto sm:px-4"
            >
              Cancelar
            </button>
            <button
              onClick={confirmAddDrink}
              className="w-full rounded-input bg-primary py-2.5 text-[15px] font-semibold text-white transition-colors active:bg-primary-hover sm:w-auto sm:px-4"
            >
              Agregar bebida
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}