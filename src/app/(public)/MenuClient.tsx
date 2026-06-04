"use client";

import { useState, useEffect, useCallback } from "react";
import { MenuGrid } from "@/components/public/menu/MenuGrid";
import { MenuHeader } from "@/components/public/menu/MenuHeader";
import { MenuModeProvider } from "@/components/public/menu/MenuModeContext";
import { ActiveOrdersBanner } from "@/components/public/ActiveOrdersBanner";
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
  dailyContornos?: SimpleItem[];
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
  isReadOnly?: boolean;
  isPrivate?: boolean;
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
  dailyContornos = [],
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
  isReadOnly = false,
  isPrivate = false,
}: MenuClientProps) {
  // ─── Theme Management (Dark Mode) ──────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

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

  // Expose a "go to menu top" handler via a custom DOM event so BottomNav
  // (a sibling subtree) can trigger it without prop drilling.
  useEffect(() => {
    const handler = () => {
      setActiveCategory(null);
      setSearchQuery("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("menu:goToTop", handler);
    return () => window.removeEventListener("menu:goToTop", handler);
  }, []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const cartItems = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const recalculateBsPrices = useCartStore((s) => s.recalculateBsPrices);
  const syncWithMenu = useCartStore((s) => s.syncWithMenu);

  useEffect(() => {
    if (isReadOnly) return;
    syncWithMenu(items);
  }, [items, syncWithMenu, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) return;
    if (rate) {
      recalculateBsPrices(rate);
    }
  }, [rate, recalculateBsPrices, isReadOnly]);

  const handleAvailabilityChange = useCallback((map: Map<string, boolean>) => {
    setAvailabilityMap(map);
    if (isReadOnly) return;

    cartItems.forEach((cartItem, index) => {
      if (map.has(cartItem.id) && map.get(cartItem.id) === false) {
        removeItem(index);
        toast.error(`"${cartItem.name}" se agotó y fue removido de tu pedido.`, {
          duration: 5000,
          id: `sold-out-${cartItem.id}`,
        });
      }
    });
  }, [cartItems, removeItem, isReadOnly]);

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
    <MenuModeProvider mode={isReadOnly ? "showcase" : "order"}>
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {!isReadOnly && <ActiveOrdersBanner />}

      {/* Premium indicator for "Menú del Día" */}
      <div className="px-5 py-3 max-w-7xl mx-auto w-full flex items-center justify-between mb-2 lg:mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-gradient-to-b from-[#bb0005] to-[#e2231a] rounded-full shrink-0" />
              <div>
                  <h2 className="font-display text-[21px] font-black text-text-main tracking-tight leading-none">
                      Menú del Día
                  </h2>
                  <p className="text-[11px] font-bold text-text-main/60 uppercase tracking-widest mt-1">
                      Opciones disponibles hoy
                  </p>
              </div>
          </div>
          <div className="hidden md:block flex-1 h-px bg-border/40 ml-6" />
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
          dailyContornos={dailyContornos}
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
          <h2 className="text-xl font-bold text-text-main mb-2 font-display">
            Menú no disponible
          </h2>
          <p className="text-[13px] text-text-muted max-w-xs leading-relaxed font-medium">
            El menú del día aún no ha sido configurado. Vuelve más tarde para
            ver las opciones disponibles.
          </p>
        </div>
      )}

    </MenuModeProvider>
  );
}
