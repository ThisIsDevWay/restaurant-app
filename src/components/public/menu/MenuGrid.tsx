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
}: MenuGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [drinkWarningItem, setDrinkWarningItem] = useState<{ payload: any; categoryName: string } | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  const availableItems = items.filter((i) => i.isAvailable);
  const unavailableItems = items.filter((i) => !i.isAvailable);
  const sortedItems = [...availableItems, ...unavailableItems];

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) ?? null
    : null;

  const handleAddSimpleItem = (payload: any, categoryName: string) => {
    const isDrink = categoryName.toLowerCase().includes("bebida");
    // Check if the cart already has a dish with a drink
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

  const gridClasses = menuLayout === "classic"
    ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" // Adding responsive stops for better scaling on desktop
    : "flex flex-col gap-3";

  return (
    <div className={`${gridClasses} px-4 pb-4`}>
      {sortedItems.map((item, index) => {
        const hasContornos = item.contornos.some((c) => c.isAvailable);
        const hasRequiredOptions = item.optionGroups.some((g) => g.required);
        const effectiveHasDailyAdicionales = adicionalesEnabled && !item.hideAdicionales && dailyAdicionales.length > 0;
        const effectiveHasDailyBebidas = bebidasEnabled && !item.hideBebidas && dailyBebidas.length > 0;

        // Si la categoría es "Simple" (Rápido), no forzamos el modal por adicionales/bebidas del día
        // Esto permite que bebidas/contornos se agreguen con 1-click como configuró el admin
        const needsDetailModal =
          !item.categoryIsSimple ||
          hasContornos ||
          hasRequiredOptions ||
          (item.categoryIsSimple ? false : (effectiveHasDailyAdicionales || effectiveHasDailyBebidas));
        const priceBsCents = rate
          ? Math.round(item.priceUsdCents * rate)
          : 0;

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
          dailyAdicionales={dailyAdicionales}
          dailyBebidas={dailyBebidas}
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
