"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Plus, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDailyMenuState } from "@/hooks/useDailyMenuState";
import { useItemContornos } from "@/hooks/useItemContornos";
import { useDailyMenuSync } from "@/hooks/useDailyMenuSync";
import { useMenuPdfDownload } from "./useMenuPdfDownload";
import { formatDateLabel } from "./DailyMenu.types";
import { DailyMenuHeader } from "./DailyMenuHeader";
import { DailyMenuPlatosTab } from "./DailyMenuPlatosTab";
import { DailyMenuSimpleTab } from "./DailyMenuSimpleTab";
import type { DailyMenuClientProps, MenuTemplate } from "./DailyMenu.types";
import { toggleContornoAlwaysShowAction } from "@/actions/contornos";
import { saveMenuTemplateAction, deleteMenuTemplateAction } from "@/actions/menu-templates";

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
  platoDelDiaItemId: initialPlatoDelDiaItemId,
  templates,
  isNewDaySugerido,
}: DailyMenuClientProps) {
  const state = useDailyMenuState({
    allItems,
    initialDailyItemIds,
    initialDailyAdicionalIds,
    initialDailyBebidaIds,
    initialDailyContornoIds,
    initialDate,
    initialPlatoDelDiaItemId,
    isNewDaySugerido,
  });

  const router = useRouter();
  const [highRiskItemIds, setHighRiskItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/availability/sellout-risk")
      .then((res) => res.json())
      .then((data) => {
        if (data?.riskMap) {
          const highRisk = new Set<string>();
          for (const [itemId, pct] of Object.entries(data.riskMap)) {
            if ((pct as number) >= 8) {
              highRisk.add(itemId);
            }
          }
          setHighRiskItemIds(highRisk);
        }
      })
      .catch((err) => console.error("Error loading sellout risk:", err));
  }, []);

  const mappedAllItems = allItems.map((item) => ({
    ...item,
    isHighRisk: highRiskItemIds.has(item.id),
  }));

  // Secure Confirmation (Paso 6)
  useEffect(() => {
    if (!state.isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
          return;
        }
        const confirmLeave = window.confirm(
          "Tienes cambios sin guardar en el menú del día. ¿Seguro que deseas salir?"
        );
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [state.isDirty]);

  const handleApplyTemplate = (template: MenuTemplate) => {
    const confirmApply = window.confirm(
      `¿Estás seguro de que deseas reemplazar la selección actual con la plantilla "${template.name}"?`
    );
    if (!confirmApply) return;

    state.setDailyItemIds(template.data.menuItemIds || []);
    state.setDailyAdicionalIds(template.data.adicionalIds || []);
    state.setDailyBebidaIds(template.data.bebidaIds || []);
    state.setDailyContornoIds(template.data.contornoIds || []);

    if (state.platoDelDiaItemId && !template.data.menuItemIds.includes(state.platoDelDiaItemId)) {
      state.setPlatoDelDiaItemId(null);
    }

    state.setIsDirty(true);
  };

  const handleSaveTemplate = async (name: string, description: string | null) => {
    const data = {
      menuItemIds: state.dailyItemIds,
      adicionalIds: state.dailyAdicionalIds,
      bebidaIds: state.dailyBebidaIds,
      contornoIds: state.dailyContornoIds,
    };

    const res = await saveMenuTemplateAction({
      name,
      description,
      data,
    });

    if (res?.data?.success) {
      router.refresh();
      return { success: true };
    }
    return { success: false, error: res?.serverError || "Error al guardar la plantilla" };
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar esta plantilla?");
    if (!confirmDelete) return;

    const res = await deleteMenuTemplateAction({ id });
    if (res?.data?.success) {
      router.refresh();
    } else {
      alert(res?.serverError || "Error al eliminar la plantilla");
    }
  };

  const [localContornos, setLocalContornos] = useState(allContornos);

  useEffect(() => {
    setLocalContornos(allContornos);
  }, [allContornos]);

  const [, startToggleTransition] = useTransition();

  function handleToggleAlwaysShowContorno(id: string, alwaysShow: boolean) {
    // Optimistic update
    setLocalContornos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, alwaysShowIfAssigned: alwaysShow } : c))
    );

    startToggleTransition(async () => {
      const res = await toggleContornoAlwaysShowAction({ id, alwaysShowIfAssigned: alwaysShow });
      if (!res?.data?.success) {
        // Revert optimistic update on failure
        setLocalContornos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, alwaysShowIfAssigned: !alwaysShow } : c))
        );
      } else {
        router.refresh();
      }
    });
  }

  const contornos = useItemContornos({ allItems, setIsDirty: state.setIsDirty });

  const sync = useDailyMenuSync({
    selectedDate: state.selectedDate,
    setSelectedDate: state.setSelectedDate,
    dailyItemIds: state.dailyItemIds,
    setDailyItemIds: state.setDailyItemIds,
    dailyAdicionalIds: state.dailyAdicionalIds,
    setDailyAdicionalIds: state.setDailyAdicionalIds,
    dailyBebidaIds: state.dailyBebidaIds,
    setDailyBebidaIds: state.setDailyBebidaIds,
    dailyContornoIds: state.dailyContornoIds,
    setDailyContornoIds: state.setDailyContornoIds,
    platoDelDiaItemId: state.platoDelDiaItemId,
    setPlatoDelDiaItemId: state.setPlatoDelDiaItemId,
    isDirty: state.isDirty,
    setIsDirty: state.setIsDirty,
    copyDate: state.copyDate,
    setCopyDate: state.setCopyDate,
    copying: state.copying,
    setCopying: state.setCopying,
    itemContornoSelections: contornos.itemContornoSelections,
    modifiedItemIds: contornos.modifiedItemIds,
    clearModifiedItems: contornos.clearModifiedItems,
  });

  const pdf = useMenuPdfDownload(state.selectedDate);
  const { label: dateLabel, badge: dateBadge } = formatDateLabel(state.selectedDate, today);

  function handleToggle(id: string) {
    state.setDailyItemIds((prev) => {
      const isRemoving = prev.includes(id);
      if (isRemoving && state.platoDelDiaItemId === id) {
        state.setPlatoDelDiaItemId(null);
      }
      return isRemoving ? prev.filter((x) => x !== id) : [...prev, id];
    });
    state.setIsDirty(true);
  }

  function handleSetPlatoDelDia(id: string | null) {
    state.setPlatoDelDiaItemId((prev) => (prev === id ? null : id));
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
      if (forceRemove || allOn) {
        if (state.platoDelDiaItemId && catItemsIds.includes(state.platoDelDiaItemId)) {
          state.setPlatoDelDiaItemId(null);
        }
        return prev.filter((id) => !catItemsIds.includes(id));
      }
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
    <div className="flex flex-col gap-5">
      <DailyMenuHeader
        itemCount={state.dailyItemIds.length}
        contornoCount={state.dailyContornoIds.length}
        adicionalCount={state.dailyAdicionalIds.length}
        bebidaCount={state.dailyBebidaIds.length}
        isDirty={state.isDirty}
        isPending={sync.isPending}
        onSave={sync.handleSave}
        pdfStatus={pdf.state.status}
        pdfPreviewUrl={pdf.state.status === "ready" ? pdf.state.previewUrl : undefined}
        pdfErrorMessage={pdf.state.status === "error" ? pdf.state.message : undefined}
        onGeneratePdf={pdf.generate}
        onDownloadPdf={pdf.download}
        onResetPdf={pdf.reset}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-border py-2.5">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const isActive = state.activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => state.setActiveTab(key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                isActive
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-text-muted hover:border-primary/40 hover:text-text-main",
              )}
            >
              <Icon size={14} />
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-bold leading-relaxed",
                  isActive
                    ? "bg-white/20 text-white"
                    : count > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-section text-text-muted",
                )}
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
          allItems={mappedAllItems}
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
          platoDelDiaItemId={state.platoDelDiaItemId}
          onSetPlatoDelDia={handleSetPlatoDelDia}
          hideAssigned={state.hideAssigned}
          onHideAssignedChange={state.setHideAssigned}
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
          activeItems={localContornos.filter((c) => state.dailyContornoIds.includes(c.id))}
          allItems={localContornos}
          activeIds={state.dailyContornoIds}
          onToggle={handleToggleContorno}
          dateLabel={dateLabel}
          onShiftDay={sync.handleShiftDay}
          emptyIcon={UtensilsCrossed}
          emptyText="Selecciona contornos del catálogo para hoy."
          onAlwaysShowToggle={handleToggleAlwaysShowContorno}
        />
      )}
    </div>
  );
}