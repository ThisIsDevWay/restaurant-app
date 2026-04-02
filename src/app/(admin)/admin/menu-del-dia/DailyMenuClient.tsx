"use client";

import {
  UtensilsCrossed,
  Plus,
  Coffee,
} from "lucide-react";
import { useDailyMenuState } from "@/hooks/useDailyMenuState";
import { useItemContornos } from "@/hooks/useItemContornos";
import { useDailyMenuSync } from "@/hooks/useDailyMenuSync";
import { formatDateLabel } from "./DailyMenu.types";
import { DailyMenuHeader } from "./DailyMenuHeader";
import { DailyMenuPlatosTab } from "./DailyMenuPlatosTab";
import { DailyMenuSimpleTab } from "./DailyMenuSimpleTab";
import type { DailyMenuClientProps } from "./DailyMenu.types";

export function DailyMenuClient({
  allItems,
  dailyItemIds: initialDailyItemIds,
  allAdicionales,
  dailyAdicionalIds: initialDailyAdicionalIds,
  allBebidas,
  dailyBebidaIds: initialDailyBebidaIds,
  allContornos,
  dailyContornoIds: initialDailyContornoIds,
  selectedDate: initialDate,
  today,
}: DailyMenuClientProps) {
  const state = useDailyMenuState({
    allItems,
    initialDailyItemIds,
    initialDailyAdicionalIds,
    initialDailyBebidaIds,
    initialDailyContornoIds,
    initialDate,
  });

  const sync = useDailyMenuSync({
    selectedDate: state.selectedDate,
    setSelectedDate: state.setSelectedDate,
    dailyItemIds: state.dailyItemIds,
    dailyAdicionalIds: state.dailyAdicionalIds,
    dailyBebidaIds: state.dailyBebidaIds,
    dailyContornoIds: state.dailyContornoIds,
    isDirty: state.isDirty,
    setIsDirty: state.setIsDirty,
    copyDate: state.copyDate,
    setCopyDate: state.setCopyDate,
    copying: state.copying,
    setCopying: state.setCopying,
  });

  const contornos = useItemContornos({ allItems });

  const { label: dateLabel, badge: dateBadge } = formatDateLabel(state.selectedDate, today);

  function handleToggle(id: string) {
    state.setDailyItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    state.setIsDirty(true);
  }

  function handleToggleAdicional(id: string) {
    state.setDailyAdicionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    state.setIsDirty(true);
  }

  function handleToggleBebida(id: string) {
    state.setDailyBebidaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    state.setIsDirty(true);
  }

  function handleToggleContorno(id: string) {
    state.setDailyContornoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    state.setIsDirty(true);
  }

  function handleToggleCategory(cat: string, forceRemove: boolean = false) {
    const catItemsIds = allItems.filter((i) => i.categoryName === cat).map((i) => i.id);
    state.setDailyItemIds((prev) => {
      const allOn = catItemsIds.every((id) => prev.includes(id));
      if (forceRemove || allOn) {
        return prev.filter((id) => !catItemsIds.includes(id));
      }
      return [...new Set([...prev, ...catItemsIds])];
    });
    state.setIsDirty(true);
  }

  const tabs = [
    { key: "platos" as const, label: "Platos del día", icon: UtensilsCrossed, count: state.dailyItemIds.length },
    { key: "contornos" as const, label: "Contornos del día", icon: UtensilsCrossed, count: state.dailyContornoIds.length },
    { key: "adicionales" as const, label: "Adicionales del día", icon: Plus, count: state.dailyAdicionalIds.length },
    { key: "bebidas" as const, label: "Bebidas del día", icon: Coffee, count: state.dailyBebidaIds.length },
  ];

  return (
    <div className="space-y-4">
      <DailyMenuHeader
        itemCount={state.dailyItemIds.length}
        contornoCount={state.dailyContornoIds.length}
        adicionalCount={state.dailyAdicionalIds.length}
        bebidaCount={state.dailyBebidaIds.length}
        isDirty={state.isDirty}
        isPending={sync.isPending}
        onSave={sync.handleSave}
      />

      <div className="flex gap-1 bg-bg-app rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => state.setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${state.activeTab === key
              ? "bg-white text-text-main shadow-sm"
              : "text-text-muted hover:text-text-main"
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${state.activeTab === key
                ? "bg-primary/10 text-primary"
                : "bg-text-muted/10 text-text-muted"
                }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {state.activeTab === "platos" && (
        <DailyMenuPlatosTab
          allItems={allItems}
          dailyItemIds={state.dailyItemIds}
          allContornos={allContornos}
          dailyContornoIds={state.dailyContornoIds}
          selectedDate={state.selectedDate}
          today={today}
          dateLabel={dateLabel}
          dateBadge={dateBadge}
          search={state.search}
          onSearchChange={state.setSearch}
          activePill={state.activePill}
          onPillChange={state.setActivePill}
          expandedItemId={state.expandedItemId}
          onToggleExpanded={state.setExpandedItemId}
          itemContornoSelections={contornos.itemContornoSelections}
          handleToggle={handleToggle}
          handleToggleCategory={handleToggleCategory}
          handleToggleContorno={contornos.handleToggleContorno}
          handleUpdateContornoSettings={contornos.handleUpdateContornoSettings}
          handleShiftDay={sync.handleShiftDay}
          copyDate={state.copyDate}
          onCopyDateChange={state.setCopyDate}
          handleCopyFrom={sync.handleCopyFrom}
          copying={sync.copying}
        />
      )}

      {state.activeTab === "adicionales" && (
        <DailyMenuSimpleTab
          title="adicional"
          activeLabel="Adicionales activos hoy"
          catalogLabel="Catálogo de adicionales"
          activeItems={allAdicionales.filter(a => state.dailyAdicionalIds.includes(a.id))}
          allItems={allAdicionales}
          activeIds={state.dailyAdicionalIds}
          onToggle={handleToggleAdicional}
          dateLabel={dateLabel}
          onShiftDay={sync.handleShiftDay}
          emptyIcon={Plus}
          emptyText="Selecciona adicionales del catálogo para hoy."
        />
      )}

      {state.activeTab === "bebidas" && (
        <DailyMenuSimpleTab
          title="bebida"
          activeLabel="Bebidas activas hoy"
          catalogLabel="Catálogo de bebidas"
          activeItems={allBebidas.filter(b => state.dailyBebidaIds.includes(b.id))}
          allItems={allBebidas}
          activeIds={state.dailyBebidaIds}
          onToggle={handleToggleBebida}
          dateLabel={dateLabel}
          onShiftDay={sync.handleShiftDay}
          emptyIcon={Coffee}
          emptyText="Selecciona bebidas del catálogo para hoy."
        />
      )}

      {state.activeTab === "contornos" && (
        <DailyMenuSimpleTab
          title="contorno"
          activeLabel="Contornos activos hoy"
          catalogLabel="Catálogo de contornos"
          activeItems={allContornos.filter(c => state.dailyContornoIds.includes(c.id))}
          allItems={allContornos}
          activeIds={state.dailyContornoIds}
          onToggle={handleToggleContorno}
          dateLabel={dateLabel}
          onShiftDay={sync.handleShiftDay}
          emptyIcon={UtensilsCrossed}
          emptyText="Selecciona contornos del catálogo para hoy."
        />
      )}
    </div>
  );
}
