"use client";

import { UtensilsCrossed, Plus, Coffee } from "lucide-react";
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
  function handleToggleCategory(cat: string, forceRemove = false) {
    const catItemsIds = allItems.filter((i) => i.categoryName === cat).map((i) => i.id);
    state.setDailyItemIds((prev) => {
      const allOn = catItemsIds.every((id) => prev.includes(id));
      if (forceRemove || allOn) return prev.filter((id) => !catItemsIds.includes(id));
      return [...new Set([...prev, ...catItemsIds])];
    });
    state.setIsDirty(true);
  }

  const tabs = [
    { key: "platos" as const, label: "Platos", icon: UtensilsCrossed, count: state.dailyItemIds.length },
    { key: "contornos" as const, label: "Contornos", icon: UtensilsCrossed, count: state.dailyContornoIds.length },
    { key: "adicionales" as const, label: "Adicionales", icon: Plus, count: state.dailyAdicionalIds.length },
    { key: "bebidas" as const, label: "Bebidas", icon: Coffee, count: state.dailyBebidaIds.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        .dmc-tab {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          border-radius: 100px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap; flex-shrink: 0;
        }
        .dmc-tab-active {
          background: #bb0005; color: #fff; border-color: #bb0005;
        }
        .dmc-tab-inactive {
          background: #fff; color: #5f5e5e; border-color: #f0e6df;
        }
        .dmc-tab-inactive:hover { border-color: #d4a99f; color: #251a07; }
        .dmc-count-badge {
          font-size: 11px; font-weight: 700;
          padding: 1px 7px; border-radius: 100px;
          line-height: 1.6;
        }
      `}</style>

      <DailyMenuHeader
        itemCount={state.dailyItemIds.length}
        contornoCount={state.dailyContornoIds.length}
        adicionalCount={state.dailyAdicionalIds.length}
        bebidaCount={state.dailyBebidaIds.length}
        isDirty={state.isDirty}
        isPending={sync.isPending}
        onSave={sync.handleSave}
      />

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        padding: "10px 0",
        borderBottom: "1px solid #f0e6df",
      }}>
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const isActive = state.activeTab === key;
          return (
            <button
              key={key}
              className={`dmc-tab ${isActive ? "dmc-tab-active" : "dmc-tab-inactive"}`}
              onClick={() => state.setActiveTab(key)}
            >
              <Icon size={14} />
              {label}
              <span
                className="dmc-count-badge"
                style={{
                  background: isActive ? "rgba(255,255,255,0.22)" : count > 0 ? "#fdeaec" : "#f0e6df",
                  color: isActive ? "#fff" : count > 0 ? "#bb0005" : "#9c8c78",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
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
          activeItems={allAdicionales.filter((a) => state.dailyAdicionalIds.includes(a.id))}
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
          activeItems={allBebidas.filter((b) => state.dailyBebidaIds.includes(b.id))}
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
          activeItems={allContornos.filter((c) => state.dailyContornoIds.includes(c.id))}
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