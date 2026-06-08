"use client";

import { cn } from "@/lib/utils";
import { UtensilsCrossed, Plus, ChevronRight, Search, X } from "lucide-react";
import { type MenuItemWithComponents } from "@/types/menu.types";
import { type CartItem } from "@/store/cartStore";
import { type SimpleItem } from "@/components/customer/ItemDetailModal.types";
import { formatBs, formatRef } from "@/lib/money";
import Image from "next/image";

// Helper components that stay local to the grid for now as they are very specific
function PriceTag({ usdCents, rate, size = "sm" }: { usdCents: number; rate: number; size?: "sm" | "md" | "lg" }) {
  const bsCents = Math.round(usdCents * rate);
  
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
        {formatRef(usdCents)}
      </span>
      <span className={`font-black text-[var(--color-text-main)] ${size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-base"}`}>
        {formatBs(bsCents).replace("Bs. ", "")}
        <span className="ml-0.5 text-[0.6em] font-medium text-[var(--color-text-muted)]">Bs</span>
      </span>
    </div>
  );
}

interface MenuItemGridProps {
  items: MenuItemWithComponents[];
  categories: { id: string; name: string }[];
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  rate: number;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  settings: Record<string, any> | null;
  cartItems: CartItem[];
  onItemPress: (item: MenuItemWithComponents) => void;
  getEmoji: (categoryName: string) => string;
  needsModal: (
    item: MenuItemWithComponents,
    dailyAdicionales: SimpleItem[],
    dailyBebidas: SimpleItem[],
    settings: Record<string, any> | null
  ) => boolean;
}

export function MenuItemGrid({
  items,
  categories,
  activeCategory,
  setActiveCategory,
  search,
  setSearch,
  rate,
  dailyAdicionales,
  dailyBebidas,
  settings,
  cartItems,
  onItemPress,
  getEmoji,
  needsModal,
}: MenuItemGridProps) {
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.categoryId === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Category tabs + search */}
      <div
        className="shrink-0 border-b border-[var(--color-border)]"
        style={{ background: "var(--color-bg-app)" }}
      >
        {/* Search bar is handled by the parent for better state management if needed, 
            but the UI is here for now as requested by the split */}
        <div className="px-3 pb-2 pt-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar plato..."
              className="w-full rounded-xl border-2 border-[var(--color-border-ghost)] bg-white py-2 pl-9 pr-9 text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] transition-all"
              style={{ fontSize: "clamp(0.8rem, 2vw, 0.875rem)" }}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              activeCategory === "all"
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] bg-white text-[var(--color-text-main)]"
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-main)]"
              }`}
            >
              {getEmoji(cat.name)} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto p-3 pb-24" style={{ gap: "clamp(0.5rem, 2vw, 0.75rem)" }}>
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center text-[var(--color-text-muted)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-section)]">
              <UtensilsCrossed size={32} strokeWidth={1.5} className="opacity-50" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-main)]">No encontramos nada</p>
              <p className="text-xs">Prueba con otros términos o categorías</p>
            </div>
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(clamp(8rem, 28vw, 11rem), 1fr))",
              gap: "clamp(0.5rem, 2vw, 0.75rem)",
            }}
          >
            {filteredItems.map(item => {
              const quickAdd = !needsModal(item, dailyAdicionales, dailyBebidas, settings);
              const inCartQty = cartItems
                .filter(ci => ci.id === item.id)
                .reduce((s, ci) => s + ci.quantity, 0);
              return (
                <button
                  key={item.id}
                  onClick={() => item.isAvailable && onItemPress(item)}
                  disabled={!item.isAvailable}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition-all",
                    item.isAvailable ? "hover:shadow-md active:scale-[0.97]" : "opacity-60 grayscale-[0.5] cursor-not-allowed"
                  )}
                  style={{
                    borderColor: inCartQty > 0 ? "var(--color-primary)" : "var(--color-border-ghost)",
                    boxShadow: inCartQty > 0
                      ? "0 4px 12px rgba(187,0,5,0.12)"
                      : undefined,
                  }}
                >
                  <div
                    className="relative flex items-center justify-center overflow-hidden"
                    style={{
                      height: "clamp(4rem, 14vw, 6rem)",
                      background: "linear-gradient(135deg, var(--color-bg-app) 0%, var(--color-surface-section) 100%)",
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 25vw, 100px"
                      />
                    ) : (
                      <span style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}>
                        {getEmoji(item.categoryName)}
                      </span>
                    )}

                    {!item.isAvailable && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-xl">
                          Agotado
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between" style={{ padding: "clamp(0.4rem, 1.5vw, 0.625rem)" }}>
                    <p className="font-display font-bold leading-snug text-[var(--color-text-main)] line-clamp-2" style={{ fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)" }}>
                      {item.name}
                    </p>
                    <div className="mt-1.5 flex items-end justify-between">
                      <PriceTag usdCents={item.priceUsdCents} rate={rate} size="sm" />
                      <div 
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform group-active:scale-90",
                          item.isAvailable ? "bg-[var(--color-primary)]" : "bg-slate-300"
                        )}
                      >
                        {item.isAvailable ? (
                          quickAdd ? <Plus size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />
                        ) : (
                          <X size={14} strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  </div>

                  {inCartQty > 0 && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-black text-white" style={{ background: "var(--color-primary)" }}>
                      {inCartQty}
                    </div>
                  )}

                  {!quickAdd && (
                    <div className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white" style={{ background: "rgba(37,26,7,0.55)" }}>
                      personalizar
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
