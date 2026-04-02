"use client";

import Image from "next/image";
import { useMemo } from "react";
import {
  UtensilsCrossed,
  Search,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { formatRef } from "@/lib/money";
import { DateNavigator } from "@/components/shared/DateNavigator";
import { CatalogItemRow } from "./CatalogItemRow";
import { ActiveItemRow } from "./ActiveItemRow";
import type { CatalogItem, ContornoSelection, SimpleItem } from "./DailyMenu.types";

interface DailyMenuPlatosTabProps {
  allItems: CatalogItem[];
  dailyItemIds: string[];
  allContornos: SimpleItem[];
  dailyContornoIds: string[];
  selectedDate: string;
  today: string;
  dateLabel: string;
  dateBadge: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  activePill: string;
  onPillChange: (pill: string) => void;
  expandedItemId: string | null;
  onToggleExpanded: (id: string | null) => void;
  itemContornoSelections: Record<string, ContornoSelection[]>;
  handleToggle: (id: string) => void;
  handleToggleCategory: (cat: string, forceRemove?: boolean) => void;
  handleToggleContorno: (itemId: string, contornoId: string, name: string) => void;
  handleUpdateContornoSettings: (itemId: string, contornoId: string, updates: Partial<ContornoSelection>) => void;
  handleShiftDay: (days: number) => void;
  copyDate: string;
  onCopyDateChange: (date: string) => void;
  handleCopyFrom: () => void;
  copying: boolean;
}

export function DailyMenuPlatosTab({
  allItems,
  dailyItemIds,
  allContornos,
  dailyContornoIds,
  dateLabel,
  dateBadge,
  search,
  onSearchChange,
  activePill,
  onPillChange,
  expandedItemId,
  onToggleExpanded,
  itemContornoSelections,
  handleToggle,
  handleToggleCategory,
  handleToggleContorno,
  handleUpdateContornoSettings,
  handleShiftDay,
  copyDate,
  onCopyDateChange,
  handleCopyFrom,
  copying,
}: DailyMenuPlatosTabProps) {
  const categories = useMemo(
    () => [...new Set(allItems.map((i) => i.categoryName))],
    [allItems]
  );

  const selectedItems = useMemo(
    () => allItems.filter((i) => dailyItemIds.includes(i.id)),
    [allItems, dailyItemIds]
  );

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const matchPill = activePill === "Todos" || item.categoryName === activePill;
      return matchSearch && matchPill;
    });
  }, [allItems, search, activePill]);

  const visibleCategories = useMemo(() => {
    if (activePill !== "Todos") return [activePill];
    return [...new Set(filteredItems.map((i) => i.categoryName))];
  }, [filteredItems, activePill]);

  return (
    <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
      {/* LEFT COLUMN: Active Items */}
      <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-bg-app/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-main">Activos hoy</span>
            {dateBadge && (
              <span className="text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                {dateBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {dailyItemIds.length > 0
              ? `${dailyItemIds.length} plato${dailyItemIds.length !== 1 ? "s" : ""} seleccionado${dailyItemIds.length !== 1 ? "s" : ""}`
              : "Ningún plato seleccionado"}
          </p>
        </div>

        <DateNavigator
          dateLabel={dateBadge ? `${dateLabel} (${dateBadge})` : dateLabel}
          onPrev={() => handleShiftDay(-1)}
          onNext={() => handleShiftDay(1)}
        />

        <div className="flex-1 overflow-y-auto bg-white/50">
          {selectedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                <UtensilsCrossed className="h-6 w-6 text-text-muted/50" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed max-w-[150px]">
                Selecciona platos del catálogo para agregarlos a hoy.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const items = selectedItems.filter((i) => i.categoryName === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-bg-app border-y border-border sticky top-0 z-10 backdrop-blur-sm bg-bg-app/90">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex-1">
                      {cat}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-white shadow-sm text-text-main border-border/60">
                      {items.length}
                    </span>
                    <button
                      onClick={() => handleToggleCategory(cat, true)}
                      className="text-[10px] px-2 py-0.5 rounded-md text-error hover:bg-error/10 hover:text-error transition-colors font-medium"
                    >
                      Quitar todos
                    </button>
                  </div>

                  <div className="px-3 py-2 space-y-2">
                    {items.map((item) => {
                      const currentContornos = itemContornoSelections[item.id] || [];
                      const availableDailyContornos = allContornos.filter(c => dailyContornoIds.includes(c.id));

                      return (
                        <ActiveItemRow
                          key={item.id}
                          item={item}
                          currentContornos={currentContornos}
                          availableDailyContornos={availableDailyContornos}
                          expandedItemId={expandedItemId}
                          onToggleExpanded={onToggleExpanded}
                          onToggleContorno={(contornoId, name) => handleToggleContorno(item.id, contornoId, name)}
                          onUpdateContornoSettings={(contornoId, updates) => handleUpdateContornoSettings(item.id, contornoId, updates)}
                          onRemove={handleToggle}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Copy From Widget */}
        <div className="px-4 py-3 border-t border-border bg-bg-app/40 flex flex-col gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar menú desde:
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              value={copyDate}
              onChange={(e) => onCopyDateChange(e.target.value)}
              className="flex-[2] min-w-0 rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            />
            <button
              onClick={handleCopyFrom}
              disabled={!copyDate || copying}
              className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-border bg-white font-medium text-text-main shadow-sm hover:bg-bg-app transition-all disabled:opacity-50 disabled:hover:bg-white"
            >
              {copying ? "Copiando..." : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Full Catalog */}
      <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b flex-shrink-0 space-y-3 bg-bg-app/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar plato en el catálogo..."
              className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["Todos", ...categories].map((cat) => {
              const isSelectedCat = activePill === cat;
              const selCount =
                cat === "Todos"
                  ? dailyItemIds.length
                  : allItems.filter(
                    (i) => i.categoryName === cat && dailyItemIds.includes(i.id)
                  ).length;
              return (
                <button
                  key={cat}
                  onClick={() => onPillChange(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border shadow-sm ${isSelectedCat
                    ? "bg-primary border-primary text-white shadow-primary/20"
                    : "bg-white border-border text-text-muted hover:border-text-muted/30"
                    }`}
                >
                  {cat}
                  {selCount > 0 && (
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.5 leading-none transition-colors ${isSelectedCat
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                        }`}
                    >
                      {selCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                <Search className="h-6 w-6 text-text-muted/50" />
              </div>
              <p className="text-sm font-medium text-text-main mb-1">Sin resultados</p>
              <p className="text-xs text-text-muted">No encontramos &quot;{search}&quot;</p>
            </div>
          ) : (
            visibleCategories.map((cat) => {
              const items = filteredItems.filter((i) => i.categoryName === cat);
              if (!items.length) return null;
              const selInCat = items.filter((i) => dailyItemIds.includes(i.id)).length;
              const allOn = selInCat === items.length;

              return (
                <div key={cat} className="mb-2">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-app border-y border-border sticky top-0 z-10 backdrop-blur-sm bg-bg-app/90">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex-1">
                      {cat}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${selInCat > 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-white text-text-muted border-border shadow-sm"
                        }`}
                    >
                      {selInCat}/{items.length}
                    </span>
                    <button
                      onClick={() => handleToggleCategory(cat)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${allOn
                        ? "bg-white border-border text-text-main hover:bg-error/5 hover:text-error hover:border-error/20"
                        : "bg-white border-border text-text-main hover:border-primary/30 hover:text-primary"
                        }`}
                    >
                      {allOn ? "Quitar todos" : "Seleccionar todos"}
                    </button>
                  </div>

                  <div className="px-3 py-2 space-y-1.5">
                    {items.map((item) => (
                      <CatalogItemRow
                        key={item.id}
                        item={item}
                        isOn={dailyItemIds.includes(item.id)}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
