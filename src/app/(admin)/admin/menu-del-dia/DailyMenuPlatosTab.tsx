"use client";

import * as React from "react";
import { useMemo, useRef } from "react";
import { UtensilsCrossed, Search, Copy, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DateNavigator } from "@/components/shared/DateNavigator";
import { CatalogItemRow } from "./CatalogItemRow";
import { ActiveItemRow } from "./ActiveItemRow";
import { cn } from "@/lib/utils";
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
  handleUpdateContornoSettings: (
    itemId: string,
    contornoId: string,
    updates: Partial<ContornoSelection>,
  ) => void;
  handleShiftDay: (days: number) => void;
  copyDate: string;
  onCopyDateChange: (date: string) => void;
  handleCopyFrom: () => void;
  copying: boolean;
  platoDelDiaItemId: string | null;
  onSetPlatoDelDia: (id: string | null) => void;
  hideAssigned: boolean;
  onHideAssignedChange: (val: boolean) => void;
}

const CAT_HEADER =
  "sticky top-0 z-10 flex items-center gap-2 border-y border-border bg-bg-app/90 px-3.5 py-2 backdrop-blur";
const CAT_NAME =
  "flex-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-muted";
const CAT_ACTION =
  "rounded-full px-2.5 py-[3px] text-[10.5px] font-bold transition-colors hover:bg-bg-app";

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
  platoDelDiaItemId,
  onSetPlatoDelDia,
  hideAssigned,
  onHideAssignedChange,
}: DailyMenuPlatosTabProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => [...new Set(allItems.map((i) => i.categoryName))],
    [allItems],
  );

  const selectedItems = useMemo(
    () => allItems.filter((i) => dailyItemIds.includes(i.id)),
    [allItems, dailyItemIds],
  );

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const matchPill = activePill === "Todos" || item.categoryName === activePill;
      const matchHideAssigned = !hideAssigned || !dailyItemIds.includes(item.id);
      return matchSearch && matchPill && matchHideAssigned;
    });
  }, [allItems, search, activePill, hideAssigned, dailyItemIds]);

  const visibleCategories = useMemo(() => {
    if (activePill !== "Todos") return [activePill];
    return [...new Set(filteredItems.map((i) => i.categoryName))];
  }, [filteredItems, activePill]);

  const handleCatalogToggle = (id: string) => {
    handleToggle(id);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems.length === 1) {
        const uniqueItem = filteredItems[0];
        handleCatalogToggle(uniqueItem.id);
        onSearchChange("");
      }
    }
  };

  return (
    <div className="grid min-h-[520px] gap-3.5 lg:grid-cols-[1fr_1.6fr]">
      {/* LEFT: Active items */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-card">
        <div className="flex-shrink-0 border-b border-border bg-bg-app px-5 py-3.5">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-text-main">Activos hoy</p>
            {dateBadge && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                {dateBadge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] text-text-muted">
            {dailyItemIds.length > 0
              ? `${dailyItemIds.length} plato${dailyItemIds.length !== 1 ? "s" : ""} seleccionado${dailyItemIds.length !== 1 ? "s" : ""}`
              : "Ningún plato seleccionado"}
          </p>
          {platoDelDiaItemId && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              {allItems.find(i => i.id === platoDelDiaItemId)?.name ?? "Plato del día"}
            </p>
          )}

          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-text-muted">
              <Copy size={11} />
              Copiar menú desde
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={copyDate}
                onChange={(e) => onCopyDateChange(e.target.value)}
                className="h-[34px] flex-[2] bg-white rounded-[9px] text-xs"
              />
              <button
                type="button"
                className="h-[34px] flex-1 rounded-[9px] border border-border bg-white text-xs font-bold text-text-main transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                onClick={handleCopyFrom}
                disabled={!copyDate || copying}
              >
                {copying ? "Copiando..." : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        <DateNavigator
          dateLabel={dateBadge ? `${dateLabel} (${dateBadge})` : dateLabel}
          onPrev={() => handleShiftDay(-1)}
          onNext={() => handleShiftDay(1)}
        />

        <div className="flex-1 overflow-y-auto bg-bg-app">
          {selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-section">
                <UtensilsCrossed size={20} className="text-text-muted/70" />
              </div>
              <p className="max-w-[160px] text-xs leading-relaxed text-text-muted">
                Selecciona platos del catálogo para agregarlos a hoy.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const items = selectedItems.filter((i) => i.categoryName === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <div className={CAT_HEADER}>
                    <span className={CAT_NAME}>{cat}</span>
                    <span className="rounded-full bg-surface-section px-1.5 text-[10px] font-bold text-text-muted">
                      {items.length}
                    </span>
                    <button
                      type="button"
                      className={cn(CAT_ACTION, "text-error hover:bg-error/10")}
                      onClick={() => handleToggleCategory(cat, true)}
                    >
                      Quitar todos
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 p-2.5">
                    {items.map((item) => {
                      const currentContornos = itemContornoSelections[item.id] || [];
                      const availableDailyContornos = allContornos.filter((c) =>
                        dailyContornoIds.includes(c.id),
                      );
                      const alwaysShowContornos = allContornos.filter((c) =>
                        !dailyContornoIds.includes(c.id) && c.alwaysShowIfAssigned,
                      );
                      return (
                        <ActiveItemRow
                          key={item.id}
                          item={item}
                          currentContornos={currentContornos}
                          availableDailyContornos={availableDailyContornos}
                          alwaysShowContornos={alwaysShowContornos}
                          expandedItemId={expandedItemId}
                          onToggleExpanded={onToggleExpanded}
                          onToggleContorno={(contornoId, name) =>
                            handleToggleContorno(item.id, contornoId, name)
                          }
                          onUpdateContornoSettings={(contornoId, updates) =>
                            handleUpdateContornoSettings(item.id, contornoId, updates)
                          }
                          onRemove={handleToggle}
                          isPlatoDelDia={platoDelDiaItemId === item.id}
                          onSetPlatoDelDia={() => onSetPlatoDelDia(item.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Catalog */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-card">
        <div className="flex flex-shrink-0 flex-col gap-2.5 border-b border-border bg-bg-app px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar plato en el catálogo..."
                className="h-[38px] bg-white pl-9 pr-24 text-[13px]"
              />
              {search.trim().length > 0 && filteredItems.length >= 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const idsToToggle = filteredItems
                      .filter((item) => !dailyItemIds.includes(item.id))
                      .map((item) => item.id);
                    if (idsToToggle.length > 0) {
                      idsToToggle.forEach((id) => handleCatalogToggle(id));
                    }
                    onSearchChange("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-extrabold text-primary transition-all hover:bg-primary hover:text-white"
                >
                  + Agregar {filteredItems.length}
                </button>
              )}
            </div>

            {/* Ocultar ya agregados switch */}
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Ocultar agregados
              </span>
              <Switch
                size="sm"
                checked={hideAssigned}
                onCheckedChange={onHideAssignedChange}
              />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {["Todos", ...categories].map((cat) => {
              const isActive = activePill === cat;
              const selCount =
                cat === "Todos"
                  ? dailyItemIds.length
                  : allItems.filter(
                      (i) => i.categoryName === cat && dailyItemIds.includes(i.id),
                    ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onPillChange(cat)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-[5px] text-[11.5px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-text-muted hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {cat}
                  {selCount > 0 && (
                    <span className={cn("text-[10px] font-extrabold", isActive ? "opacity-75" : "opacity-65")}>
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
            <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-section">
                <Search size={20} className="text-text-muted/70" />
              </div>
              <p className="text-[13px] font-semibold text-text-main">Sin resultados</p>
              <p className="text-xs text-text-muted">
                No encontramos &ldquo;{search}&rdquo;
              </p>
            </div>
          ) : (
            visibleCategories.map((cat) => {
              const items = filteredItems.filter((i) => i.categoryName === cat);
              if (!items.length) return null;
              const selInCat = items.filter((i) => dailyItemIds.includes(i.id)).length;
              const allOn = selInCat === items.length;
              return (
                <div key={cat}>
                  <div className={CAT_HEADER}>
                    <span className={CAT_NAME}>{cat}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        selInCat > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-section text-text-muted",
                      )}
                    >
                      {selInCat}/{items.length}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        CAT_ACTION,
                        allOn ? "text-error hover:bg-error/10" : "text-primary hover:bg-primary/10",
                      )}
                      onClick={() => handleToggleCategory(cat)}
                    >
                      {allOn ? "Quitar todos" : "Seleccionar todos"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 p-2.5">
                    {items.map((item) => (
                      <CatalogItemRow
                        key={item.id}
                        item={item}
                        isOn={dailyItemIds.includes(item.id)}
                        onToggle={handleCatalogToggle}
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
