"use client";

import { SelectableItemRow } from "./SelectableItemRow";
import type { CatalogItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

interface CatalogItemRowProps {
  item: CatalogItem;
  isOn: boolean;
  onToggle: (id: string) => void;
}

export function CatalogItemRow({ item, isOn, onToggle }: CatalogItemRowProps) {
  return (
    <SelectableItemRow
      name={item.name}
      priceUsdCents={item.priceUsdCents}
      imageUrl={item.imageUrl}
      selected={isOn}
      onToggle={() => onToggle(item.id)}
      showImage
    />
  );
}
