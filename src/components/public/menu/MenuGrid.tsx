"use client";

import { useState } from "react";
import { MenuItemCard } from "./MenuItemCard";
import { ItemDetailModal } from "@/components/client/ItemDetailModal";
import { useCartStore } from "@/store/cartStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  categoryId: string;
  categoryName: string;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  sortOrder: number;
  optionGroups: Array<{
    id: string;
    name: string;
    type: "radio" | "checkbox";
    required: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      isAvailable: boolean;
      sortOrder: number;
    }>;
  }>;
  adicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    isAvailable: boolean;
    sortOrder: number;
  }>;
  bebidas?: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    isAvailable: boolean;
    sortOrder: number;
  }>;
  contornos: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    isAvailable: boolean;
    removable: boolean;
    substituteContornoIds: string[];
    sortOrder: number;
  }>;
}

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
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
  };

  const confirmAddDrink = () => {
    if (drinkWarningItem) {
      addItem(drinkWarningItem.payload);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
      setDrinkWarningItem(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      {sortedItems.map((item, index) => {
        const hasContornos = item.contornos.some((c) => c.isAvailable);
        const hasRequiredOptions = item.optionGroups.some((g) => g.required);
        const hasDailyAdicionales = adicionalesEnabled && dailyAdicionales.length > 0;
        const hasDailyBebidas = bebidasEnabled && dailyBebidas.length > 0;

        const needsDetailModal =
          !item.categoryIsSimple &&
          (hasContornos || hasRequiredOptions || hasDailyAdicionales || hasDailyBebidas);
        const priceBsCents = rate
          ? Math.round(item.priceUsdCents * rate)
          : 0;

        return (
          <MenuItemCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            priceUsdCents={item.priceUsdCents}
            priceBsCents={priceBsCents}
            categoryName={item.categoryName}
            categoryAllowAlone={item.categoryAllowAlone}
            isAvailable={item.isAvailable}
            imageUrl={item.imageUrl}
            priority={index < 4}
            hasRequiredOptions={needsDetailModal}
            onOpenDetail={() => setSelectedItemId(item.id)}
            onAddSimpleItem={handleAddSimpleItem}
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
