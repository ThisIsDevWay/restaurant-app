"use client";

import { useState, useEffect } from "react";
import { MenuGrid } from "@/components/public/menu/MenuGrid";
import { MenuHeader } from "@/components/public/menu/MenuHeader";
import { useCartStore } from "@/store/cartStore";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";
import { useMenuAvailability } from "@/hooks/useMenuAvailability";
import { toast } from "sonner";
import { useCallback } from "react";

interface Category {
  id: string;
  name: string;
  emoji?: string;
  allowAlone: boolean;
  isSimple: boolean;
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

interface MenuClientProps {
  items: MenuItem[];
  categories: Category[];
  rate: number | null;
  allContornos: ContornoOption[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  maxQuantityPerItem?: number;
  menuLayout?: "modern" | "classic";
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  restaurantName?: string;
  branchName?: string | null;
  scheduleText?: string | null;
  instagramUrl?: string | null;
  showRate?: boolean;
  rateData?: {
    rate: number;
    fetchedAt: string | Date;
    currency?: string;
  } | null;
}

export function MenuClient({
  items,
  categories,
  rate,
  allContornos,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
  maxQuantityPerItem = 10,
  menuLayout = "modern",
  coverImageUrl = null,
  logoUrl = null,
  restaurantName = "G&M",
  branchName = null,
  scheduleText = null,
  instagramUrl = null,
  showRate = false,
  rateData = null,
}: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, boolean>>(new Map());
  const cartItems = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const recalculateBsPrices = useCartStore((s) => s.recalculateBsPrices);
  const syncWithMenu = useCartStore((s) => s.syncWithMenu);

  useEffect(() => {
    // Sincronizar items del carrito con el catálogo activo
    syncWithMenu(items);
  }, [items, syncWithMenu]);

  useEffect(() => {
    if (rate) {
      recalculateBsPrices(rate);
    }
  }, [rate, recalculateBsPrices]);

  const handleAvailabilityChange = useCallback((map: Map<string, boolean>) => {
    setAvailabilityMap(map);
    
    // Check if any item in cart became unavailable
    cartItems.forEach((cartItem, index) => {
      if (map.has(cartItem.id) && map.get(cartItem.id) === false) {
        removeItem(index);
        toast.error(`"${cartItem.name}" se agotó y fue removido de tu pedido.`, {
          duration: 5000,
          id: `sold-out-${cartItem.id}`, // Avoid multiple toasts for same item
        });
      }
    });
  }, [cartItems, removeItem]);

  useMenuAvailability(handleAvailabilityChange);

  const filteredItems = activeCategory
    ? items.filter((i) => i.categoryId === activeCategory)
    : items;

  return (
    <>
      <div className="z-20 bg-bg-app shadow-card mb-4 lg:mb-6">
        <MenuHeader
          coverImageUrl={coverImageUrl}
          logoUrl={logoUrl}
          restaurantName={restaurantName}
          branchName={branchName}
          scheduleText={scheduleText}
          categories={categories}
          activeCategoryId={activeCategory}
          onCategoryChange={setActiveCategory}
          instagramUrl={instagramUrl}
          showRate={showRate}
          rateData={rateData}
        />
      </div>
      {items.length > 0 ? (
        <MenuGrid
          items={filteredItems}
          rate={rate}
          allContornos={allContornos}
          adicionalesEnabled={adicionalesEnabled}
          bebidasEnabled={bebidasEnabled}
          dailyAdicionales={dailyAdicionales}
          dailyBebidas={dailyBebidas}
          maxQuantityPerItem={maxQuantityPerItem}
          menuLayout={menuLayout}
          availabilityMap={availabilityMap}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#7B2D2D]/5">
            <span className="text-4xl">🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-[#251a07] mb-2 font-display">
            Menú no disponible
          </h2>
          <p className="text-[13px] text-[#251a07]/60 max-w-xs leading-relaxed font-medium">
            El menú del día aún no ha sido configurado. Vuelve más tarde para
            ver las opciones disponibles.
          </p>
        </div>
      )}
    </>
  );
}
