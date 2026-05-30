"use client";

import { useState, useEffect, useCallback } from "react";
import { MenuGrid } from "@/components/public/menu/MenuGrid";
import { MenuHeader } from "@/components/public/menu/MenuHeader";
import { PlatoDelDiaBanner } from "@/components/public/menu/PlatoDelDiaBanner";
import { useCartStore } from "@/store/cartStore";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";
import { useMenuAvailability } from "@/hooks/useMenuAvailability";
import { useMenuRefresh, type MenuItemUpdatePayload } from "@/hooks/useMenuRefresh";
import { isMenuVisible, type StatusOverride } from "@/lib/utils/date";
import { ClosedScreen } from "@/components/public/menu/ClosedScreen";
import { toast } from "sonner";

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
  isPrepackaged: boolean;
  sortOrder: number;
}

interface SimpleItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  isPrepackaged: boolean;
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
  businessHours?: { days: number[]; open: string; close: string } | null;
  statusOverride?: StatusOverride;
  hideMenuWhenClosed?: boolean;
  preOpenVisibilityMinutes?: number;
  /** Server-computed initial visibility, prevents a flash before the client recomputes. */
  initialVisible?: boolean;
  instagramUrl?: string | null;
  showRate?: boolean;
  rateData?: {
    rate: number;
    fetchedAt: string | Date;
    currency?: string;
  } | null;
}

export function MenuClient({
  items: initialItems,
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
  businessHours = null,
  statusOverride = "auto",
  hideMenuWhenClosed = false,
  preOpenVisibilityMinutes = 0,
  initialVisible = true,
  instagramUrl = null,
  showRate = false,
  rateData = null,
}: MenuClientProps) {
  // ─── Estado local de items ─────────────────────────────────────────────────
  // Inicializado con los props del RSC. Se actualiza de dos formas:
  //  1. router.refresh() (cambios estructurales) → llega nueva prop initialItems
  //  2. handleItemUpdate (precio/nombre) → merge en estado sin round-trip a DB
  const [items, setItems] = useState<MenuItem[]>(initialItems);

  // Sincronizar cuando el RSC pasa props frescos (después de router.refresh())
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Visibilidad del menú según horario/estado. Valor inicial calculado en el
  // servidor (sin parpadeo); se recalcula en cliente cada 60 s para captar la
  // transición por reloj. Los cambios de configuración llegan vía useMenuRefresh
  // (realtime de settings → router.refresh() → nuevos props → recálculo).
  const [visible, setVisible] = useState(initialVisible);
  useEffect(() => {
    const compute = () =>
      setVisible(
        isMenuVisible(businessHours, {
          hideWhenClosed: hideMenuWhenClosed,
          preOpenMinutes: preOpenVisibilityMinutes,
          statusOverride,
        }),
      );
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [businessHours, hideMenuWhenClosed, preOpenVisibilityMinutes, statusOverride]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, boolean>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const cartItems = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const recalculateBsPrices = useCartStore((s) => s.recalculateBsPrices);
  const syncWithMenu = useCartStore((s) => s.syncWithMenu);

  useEffect(() => {
    syncWithMenu(items);
  }, [items, syncWithMenu]);

  useEffect(() => {
    if (rate) {
      recalculateBsPrices(rate);
    }
  }, [rate, recalculateBsPrices]);

  const handleAvailabilityChange = useCallback((map: Map<string, boolean>) => {
    setAvailabilityMap(map);

    cartItems.forEach((cartItem, index) => {
      if (map.has(cartItem.id) && map.get(cartItem.id) === false) {
        removeItem(index);
        toast.error(`"${cartItem.name}" se agotó y fue removido de tu pedido.`, {
          duration: 5000,
          id: `sold-out-${cartItem.id}`,
        });
      }
    });
  }, [cartItems, removeItem]);

  /**
   * Recibe el payload de un UPDATE en menu_items vía Realtime y hace merge
   * en el estado local sin necesitar router.refresh() ni una query a la DB.
   * Solo se aplica si el item está en el menú de hoy (filtrado por id).
   */
  const handleItemUpdate = useCallback((updated: MenuItemUpdatePayload) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      ),
    );
  }, []);

  useMenuAvailability(handleAvailabilityChange);
  useMenuRefresh(handleItemUpdate);

  const filteredItems = items.filter((i) => {
    const matchesCategory = !activeCategory || i.categoryId === activeCategory;
    const matchesSearch =
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.description &&
        i.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const showBanners = activeCategory === null && searchQuery === "";
  const platoDelDiaItem =
    items.find((item) => item.isPlatoDelDia && item.isAvailable) ||
    items.find((item) => item.imageUrl && item.isAvailable) ||
    items.find((item) => item.isAvailable) ||
    null;

  if (!visible) {
    return (
      <ClosedScreen
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        scheduleText={scheduleText}
        businessHours={businessHours}
        statusOverride={statusOverride}
      />
    );
  }

  return (
    <>
      <div className="z-20 bg-bg-app shadow-card mb-4 lg:mb-6">
        <MenuHeader
          coverImageUrl={coverImageUrl}
          logoUrl={logoUrl}
          restaurantName={restaurantName}
          branchName={branchName}
          scheduleText={scheduleText}
          businessHours={businessHours}
          statusOverride={statusOverride}
          categories={categories}
          activeCategoryId={activeCategory}
          onCategoryChange={setActiveCategory}
          instagramUrl={instagramUrl}
          showRate={showRate}
          rateData={rateData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {showBanners && (
        <>
          <PlatoDelDiaBanner
            item={platoDelDiaItem}
            rate={rate}
            onOpenDetail={setSelectedItemId}
          />
        </>
      )}

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
          selectedItemId={selectedItemId}
          onSelectedItemIdChange={setSelectedItemId}
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
