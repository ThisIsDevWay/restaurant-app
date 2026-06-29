"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Plus, ChevronRight, Search, X } from "lucide-react";
import { type MenuItemWithComponents } from "@/types/menu.types";
import { type CartItem } from "@/store/cartStore";
import { type SimpleItem } from "@/components/customer/ItemDetailModal.types";
import { formatBs, formatRef } from "@/lib/money";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const frequentCategories = categories.slice(0, 5);
  const remainingCategories = categories.slice(5);
  const isExtraActive = remainingCategories.some(c => c.id === activeCategory);
  const activeExtraCategory = remainingCategories.find(c => c.id === activeCategory);

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
        <div className="flex flex-wrap gap-2 px-3 pb-3">
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
          {frequentCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setDropdownOpen(false);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-main)] hover:bg-slate-50"
              }`}
            >
              {getEmoji(cat.name)} {cat.name}
            </button>
          ))}

          {/* Más Categorías */}
          {remainingCategories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  isExtraActive
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                    : "border-[var(--color-border)] bg-white text-[var(--color-text-main)] hover:bg-slate-50"
                }`}
              >
                <span>{isExtraActive ? `${getEmoji(activeExtraCategory?.name ?? "")} ${activeExtraCategory?.name}` : "Más"}</span>
                <span className="text-[8px] opacity-70">▼</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-48 rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg z-50 max-h-60 overflow-y-auto">
                    {remainingCategories.map(cat => {
                      const selected = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-1.5 ${
                            selected
                              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold"
                              : "text-[var(--color-text-main)] hover:bg-slate-50"
                          }`}
                        >
                          <span>{getEmoji(cat.name)}</span>
                          <span className="truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
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
                    "group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition-all duration-200",
                    item.isAvailable ? "hover:shadow-md active:scale-[0.97]" : "opacity-60 grayscale-[0.5] cursor-not-allowed"
                  )}
                  style={{
                    borderColor: inCartQty > 0 ? "var(--color-primary)" : "var(--color-border-ghost)",
                    boxShadow: inCartQty > 0
                      ? "0 4px 12px rgba(187,0,5,0.12)"
                      : "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
                  }}
                >
                  <div className="flex flex-1 flex-col justify-between" style={{ padding: "clamp(0.5rem, 1.5vw, 0.75rem)" }}>
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="font-display font-bold leading-snug text-[var(--color-text-main)] line-clamp-2" style={{ fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)" }}>
                        {getEmoji(item.categoryName)} {item.name}
                      </p>
                      {inCartQty > 0 && (
                        <div className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 text-[0.6rem] font-black text-white" style={{ background: "var(--color-primary)" }}>
                          {inCartQty}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {!item.isAvailable && (
                        <span className="rounded bg-rose-50 px-1 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-700 border border-rose-100">
                          Agotado
                        </span>
                      )}
                      {quickAdd && item.isAvailable && (
                        <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100">
                          Fijo
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-end justify-between">
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
