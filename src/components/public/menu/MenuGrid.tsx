"use client";

import { useState } from "react";
import { MenuItemCard } from "./MenuItemCard";
import { ItemDetailModal } from "@/components/client/ItemDetailModal";

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
}

export function MenuGrid({
  items,
  rate,
  allContornos,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
}: MenuGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const availableItems = items.filter((i) => i.isAvailable);
  const unavailableItems = items.filter((i) => !i.isAvailable);
  const sortedItems = [...availableItems, ...unavailableItems];

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) ?? null
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      {sortedItems.map((item) => {
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
            hasRequiredOptions={needsDetailModal}
            onOpenDetail={() => setSelectedItemId(item.id)}
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
        />
      )}
    </div>
  );
}
