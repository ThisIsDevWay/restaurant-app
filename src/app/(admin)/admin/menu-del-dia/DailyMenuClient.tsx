"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  UtensilsCrossed,
  X,
  Search,
  Loader2,
  CheckCircle2,
  Plus,
  Coffee,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  syncDailyMenuAction,
  syncDailyAdicionalesAction,
  syncDailyBebidasAction,
  syncDailyContornosAction,
  copyDailyMenuFromAction,
} from "@/actions/daily-menu";
import { saveMenuItemContornosAction } from "@/actions/contornos";
import { formatRef } from "@/lib/money";

interface ContornoSelection {
  id: string;
  name: string;
  removable: boolean;
  substituteContornoIds: string[];
}

interface CatalogItem {
  id: string;
  name: string;
  categoryName: string;
  priceUsdCents: number;
  imageUrl: string | null;
  contornos: ContornoSelection[];
}

interface SimpleItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
}

interface DailyMenuClientProps {
  allItems: CatalogItem[];
  dailyItemIds: string[];
  allAdicionales: SimpleItem[];
  dailyAdicionalIds: string[];
  allBebidas: SimpleItem[];
  dailyBebidaIds: string[];
  allContornos: SimpleItem[];
  dailyContornoIds: string[];
  selectedDate: string;
  today: string;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr: string, today: string): { label: string; badge: string | null } {
  const d = parseDateLocal(dateStr);
  const label = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  if (dateStr === today) return { label, badge: "Hoy" };
  const t = parseDateLocal(today);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === -1) return { label, badge: "Ayer" };
  if (diff === 1) return { label, badge: "Mañana" };
  return { label, badge: null };
}

function shiftDate(dateStr: string, days: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  const router = useRouter();

  // Local state for UI
  const [dailyItemIds, setDailyItemIds] = useState<string[]>(initialDailyItemIds);
  const [dailyAdicionalIds, setDailyAdicionalIds] = useState<string[]>(initialDailyAdicionalIds);
  const [dailyBebidaIds, setDailyBebidaIds] = useState<string[]>(initialDailyBebidaIds);
  const [dailyContornoIds, setDailyContornoIds] = useState<string[]>(initialDailyContornoIds);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [search, setSearch] = useState("");
  const [activePill, setActivePill] = useState<string>("Todos");
  const [copyDate, setCopyDate] = useState("");
  const [activeTab, setActiveTab] = useState<"platos" | "adicionales" | "bebidas" | "contornos">("platos");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemContornoSelections, setItemContornoSelections] = useState<Record<string, ContornoSelection[]>>({});

  // Initialize item contorno selections from allItems
  useEffect(() => {
    const initialSelections: Record<string, ContornoSelection[]> = {};
    allItems.forEach((item) => {
      initialSelections[item.id] = (item.contornos || []).map((c) => ({
        id: c.id,
        name: c.name,
        removable: c.removable,
        substituteContornoIds: c.substituteContornoIds || [],
      }));
    });
    setItemContornoSelections(initialSelections);
  }, [allItems]);

  // Sync state
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(false);
  const [copying, setCopying] = useState(false);

  // Sync to backend
  function handleSave() {
    if (!isDirty || isPending) return;

    startTransition(async () => {
      try {
        await Promise.all([
          syncDailyMenuAction({ date: selectedDate, menuItemIds: dailyItemIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación menú"); return r; }),
          syncDailyAdicionalesAction({ date: selectedDate, adicionalIds: dailyAdicionalIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación adicionales"); return r; }),
          syncDailyBebidasAction({ date: selectedDate, bebidaIds: dailyBebidaIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación bebidas"); return r; }),
          syncDailyContornosAction({ date: selectedDate, contornoIds: dailyContornoIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación contornos"); return r; }),
        ]);
        setIsDirty(false);
      } catch (error) {
        console.error("Error saving daily menu:", error);
      }
    });
  }

  // Derived state
  const categories = useMemo(
    () => [...new Set(allItems.map((i) => i.categoryName))],
    [allItems]
  );
  const { label: dateLabel, badge: dateBadge } = formatDateLabel(selectedDate, today);

  const selectedItems = useMemo(
    () => allItems.filter((i) => dailyItemIds.includes(i.id)),
    [allItems, dailyItemIds]
  );
  const activeCategoryCount = useMemo(
    () => new Set(selectedItems.map((i) => i.categoryName)).size,
    [selectedItems]
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

  // Actions
  function handleToggle(id: string) {
    setDailyItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setIsDirty(true);
  }

  function handleToggleAdicional(id: string) {
    setDailyAdicionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setIsDirty(true);
  }

  function handleToggleBebida(id: string) {
    setDailyBebidaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setIsDirty(true);
  }

  function handleToggleContorno(id: string) {
    setDailyContornoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setIsDirty(true);
  }

  function handleToggleCategory(cat: string, forceRemove: boolean = false) {
    const catItemsIds = allItems.filter((i) => i.categoryName === cat).map((i) => i.id);

    setDailyItemIds((prev) => {
      const allOn = catItemsIds.every((id) => prev.includes(id));
      if (forceRemove || allOn) {
        // Remove all
        return prev.filter((id) => !catItemsIds.includes(id));
      } else {
        // Add all distinct
        return [...new Set([...prev, ...catItemsIds])];
      }
    });
    setIsDirty(true);
  }

  // Navigation and Copy
  async function handleCopyFrom() {
    if (!copyDate) return;
    setCopying(true);
    const result = await copyDailyMenuFromAction({ fromDate: copyDate, toDate: selectedDate });
    setCopying(false);
    if (result?.serverError || result?.validationErrors) {
      console.error(result.serverError || "Error de validación al copiar");
      return;
    }
    if (result?.data?.success) {
      router.refresh(); // re-fetch the new initialDailyItemIds
      setCopyDate("");
    }
  }

  function handleShiftDay(days: number) {
    if (isDirty) {
      // Force immediate sync before switching
      handleSave(); // Use the new handleSave function
    }
    const next = shiftDate(selectedDate, days);
    setSelectedDate(next);
    router.push(`/admin/menu-del-dia?date=${next}`);
  }

  // Effect to sync local state when changing dates causes a prop update
  useEffect(() => {
    if (!isDirty) {
      setDailyItemIds(initialDailyItemIds);
      setDailyAdicionalIds(initialDailyAdicionalIds);
      setDailyBebidaIds(initialDailyBebidaIds);
      setDailyContornoIds(initialDailyContornoIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDailyItemIds, initialDailyAdicionalIds, initialDailyBebidaIds, initialDailyContornoIds]);

  return (
    <div className="space-y-4">
      {/* Overview header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-main">Menú del día</h1>
            {/* Saving status indicator */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!isDirty || isPending}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${isDirty
                  ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                  : "bg-bg-app text-text-muted cursor-not-allowed"
                  }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : isDirty ? (
                  "Guardar cambios"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Guardado
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Activa los platos disponibles para cada día.
          </p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: dailyItemIds.length, label: "Platos del día" },
          { value: dailyContornoIds.length, label: "Contornos del día" },
          { value: dailyAdicionalIds.length, label: "Adicionales del día" },
          { value: dailyBebidaIds.length, label: "Bebidas del día" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-bg-app rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-text-main">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-app rounded-xl p-1">
        {[
          { key: "platos" as const, label: "Platos del día", icon: UtensilsCrossed },
          { key: "contornos" as const, label: "Contornos del día", icon: UtensilsCrossed },
          { key: "adicionales" as const, label: "Adicionales del día", icon: Plus },
          { key: "bebidas" as const, label: "Bebidas del día", icon: Coffee },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key
              ? "bg-white text-text-main shadow-sm"
              : "text-text-muted hover:text-text-main"
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === key
                ? "bg-primary/10 text-primary"
                : "bg-text-muted/10 text-text-muted"
                }`}
            >
              {key === "platos"
                ? dailyItemIds.length
                : key === "adicionales"
                  ? dailyAdicionalIds.length
                  : key === "contornos"
                    ? dailyContornoIds.length
                    : dailyBebidaIds.length}
            </span>
          </button>
        ))}
      </div>

      {/* Main split view */}
      {activeTab === "platos" && (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
          {/* LEFT COLUMN: Active Items */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            {/* Header left */}
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

            {/* Date Selector */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
              <button
                onClick={() => handleShiftDay(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium text-text-main">
                {dateLabel}
              </span>
              <button
                onClick={() => handleShiftDay(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Active Items List */}
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
                      {/* Active Category Header */}
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

                      {/* Active Item Rows */}
                      <div className="px-3 py-2 space-y-2">
                        {items.map((item) => {
                          const currentContornos = itemContornoSelections[item.id] || [];
                          const availableDailyContornos = allContornos.filter(c => dailyContornoIds.includes(c.id));

                          const handleToggleContorno = (contornoId: string, name: string) => {
                            let newSelections: ContornoSelection[];
                            setItemContornoSelections(prev => {
                              const existing = prev[item.id] || [];
                              const isAlreadySelected = existing.some(c => c.id === contornoId);

                              if (isAlreadySelected) {
                                newSelections = existing.filter(c => c.id !== contornoId);
                              } else {
                                newSelections = [...existing, { id: contornoId, name, removable: true, substituteContornoIds: [] }];
                              }

                              return { ...prev, [item.id]: newSelections };
                            });
                            // Auto-save after state update
                            setTimeout(() => {
                              startTransition(async () => {
                                const selections = newSelections!;
                                const result = await saveMenuItemContornosAction({
                                  menuItemId: item.id,
                                  items: selections.map(c => ({
                                    contornoId: c.id,
                                    removable: c.removable,
                                    substituteContornoIds: c.substituteContornoIds,
                                  }))
                                });
                                if (result?.serverError || result?.validationErrors) {
                                  console.error(result.serverError || "Error validando contornos");
                                }
                              });
                            }, 0);
                          };

                          const handleUpdateContornoSettings = (contornoId: string, updates: Partial<ContornoSelection>) => {
                            let newSelections: ContornoSelection[];
                            setItemContornoSelections(prev => {
                              const existing = prev[item.id] || [];
                              newSelections = existing.map(c => c.id === contornoId ? { ...c, ...updates } : c);
                              return { ...prev, [item.id]: newSelections };
                            });
                            // Auto-save after state update
                            setTimeout(() => {
                              startTransition(async () => {
                                const selections = newSelections!;
                                const result = await saveMenuItemContornosAction({
                                  menuItemId: item.id,
                                  items: selections.map(c => ({
                                    contornoId: c.id,
                                    removable: c.removable,
                                    substituteContornoIds: c.substituteContornoIds,
                                  }))
                                });
                                if (result?.serverError || result?.validationErrors) {
                                  console.error(result.serverError || "Error validando contornos");
                                }
                              });
                            }, 0);
                          };

                          return (
                            <div
                              key={item.id}
                              className="group flex flex-col gap-2 p-2.5 rounded-2xl bg-white border border-border/60 hover:border-primary/20 hover:shadow-md transition-all animate-in fade-in slide-in-from-left-2 duration-300"
                            >
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-border/50 shadow-sm"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-xl bg-bg-app flex-shrink-0 ring-1 ring-border/50 shadow-sm" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-text-main leading-tight truncate">
                                    {item.name}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleToggle(item.id)}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Minimalist Contorno Selection */}
                              <div className="mt-1 px-1">
                                <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  Acompañamientos
                                </p>

                                {availableDailyContornos.length === 0 ? (
                                  <p className="text-[10px] text-error font-medium italic bg-error/5 border border-error/10 p-2 rounded-lg">
                                    ⚠️ Configura primero los &quot;Contornos del día&quot;
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {availableDailyContornos.map((contorno) => {
                                      const selection = currentContornos.find(c => c.id === contorno.id);
                                      const isSelected = !!selection;
                                      const isExpanded = isSelected && expandedItemId === `${item.id}-${contorno.id}`;

                                      return (
                                        <div key={contorno.id} className="relative flex items-center gap-1">
                                          <button
                                            onClick={() => handleToggleContorno(contorno.id, contorno.name)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shadow-sm ${isSelected
                                              ? "bg-primary/10 border-primary/30 text-primary"
                                              : "bg-white border-border/80 text-text-muted hover:border-primary/30 hover:text-text-main"
                                              }`}
                                          >
                                            {contorno.name}
                                          </button>
                                          {isSelected && (
                                            <button
                                              onClick={() => setExpandedItemId(isExpanded ? null : `${item.id}-${contorno.id}`)}
                                              className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all border shadow-sm ${isExpanded
                                                ? "bg-primary text-white border-primary"
                                                : "bg-white border-border/60 text-text-muted hover:border-primary/30 hover:text-primary"
                                                }`}
                                              title="Ajustes"
                                            >
                                              <Settings2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}

                                          {/* Tiny Popup for Settings */}
                                          {isExpanded && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={() => setExpandedItemId(null)} />
                                              <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-border shadow-elevated rounded-xl p-3 animate-in fade-in zoom-in-95 duration-150">
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="text-[10px] font-bold text-text-main uppercase">Ajustes: {contorno.name}</span>
                                                  <button onClick={() => setExpandedItemId(null)}><X className="h-3 w-3 text-text-muted" /></button>
                                                </div>

                                                <div className="flex items-center justify-between mb-3 bg-bg-app p-2 rounded-lg border border-border/50">
                                                  <span className="text-[10px] font-medium text-text-muted">¿Intercambiable?</span>
                                                  <Switch
                                                    checked={selection.removable}
                                                    onCheckedChange={(val) => handleUpdateContornoSettings(contorno.id, { removable: val })}
                                                    className="scale-75"
                                                  />
                                                </div>

                                                {selection.removable && (
                                                  <div className="space-y-2">
                                                    <p className="text-[9px] font-bold text-text-muted/60 uppercase px-1">Sustitutos</p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {availableDailyContornos
                                                        .filter(c => c.id !== contorno.id)
                                                        .map(sub => {
                                                          const isSubSelected = selection.substituteContornoIds?.includes(sub.id);
                                                          return (
                                                            <button
                                                              key={sub.id}
                                                              onClick={() => {
                                                                const newSubs = isSubSelected
                                                                  ? selection.substituteContornoIds.filter(id => id !== sub.id)
                                                                  : [...(selection.substituteContornoIds || []), sub.id];
                                                                handleUpdateContornoSettings(contorno.id, { substituteContornoIds: newSubs });
                                                              }}
                                                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all border ${isSubSelected
                                                                ? "bg-primary/10 border-primary/20 text-primary"
                                                                : "bg-white border-border text-text-muted hover:text-text-main hover:border-primary/20"
                                                                }`}
                                                            >
                                                              {sub.name}
                                                            </button>
                                                          );
                                                        })}
                                                    </div>
                                                    {(!selection.substituteContornoIds || selection.substituteContornoIds.length === 0) && (
                                                      <p className="text-[8px] text-text-muted/60 italic px-1">Cualquiera del día</p>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
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
                  onChange={(e) => setCopyDate(e.target.value)}
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
            {/* Catalog Toolbar */}
            <div className="px-4 py-3 border-b flex-shrink-0 space-y-3 bg-bg-app/40">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                      onClick={() => setActivePill(cat)}
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

            {/* Catalog Items */}
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
                      {/* Catalog Category Header */}
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
                        {items.map((item) => {
                          const isOn = dailyItemIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleToggle(item.id)}
                              className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isOn
                                ? "bg-primary/[0.03] border-primary/30 shadow-sm hover:border-primary/50"
                                : "bg-white border-transparent hover:border-border hover:shadow-sm"
                                }`}
                            >
                              {/* Checkbox Styled */}
                              <div
                                className={`h-5 w-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${isOn
                                  ? "bg-primary border-primary text-white"
                                  : "bg-white border border-border group-hover:border-primary/40 text-transparent"
                                  }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                              </div>

                              {/* Item Img */}
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-border/50"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-bg-app flex-shrink-0 ring-1 ring-border/50" />
                              )}

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate transition-colors ${isOn ? "text-primary" : "text-text-main"}`}>
                                  {item.name}
                                </p>
                                <p className="text-xs font-semibold text-price-green mt-0.5">
                                  {formatRef(item.priceUsdCents)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adicionales Tab */}
      {activeTab === "adicionales" && (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
          {/* LEFT: Active Adicionales */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Adicionales activos hoy</span>
              <p className="text-xs text-text-muted mt-0.5">
                {dailyAdicionalIds.length > 0
                  ? `${dailyAdicionalIds.length} adicional${dailyAdicionalIds.length !== 1 ? "es" : ""} seleccionado${dailyAdicionalIds.length !== 1 ? "s" : ""}`
                  : "Ningún adicional seleccionado"}
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
              <button
                onClick={() => handleShiftDay(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium text-text-main">
                {dateLabel}
              </span>
              <button
                onClick={() => handleShiftDay(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white/50">
              {dailyAdicionalIds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                    <Plus className="h-6 w-6 text-text-muted/50" />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed max-w-[150px]">
                    Selecciona adicionales del catálogo para hoy.
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-1">
                  {allAdicionales
                    .filter((a) => dailyAdicionalIds.includes(a.id))
                    .map((adicional) => (
                      <div
                        key={adicional.id}
                        className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-border/40 hover:border-error/30 hover:shadow-sm transition-all"
                      >
                        <span className="flex-1 text-xs font-medium text-text-main truncate">
                          {adicional.name}
                        </span>
                        <span className="text-[10px] font-semibold text-price-green">
                          {formatRef(adicional.priceUsdCents)}
                        </span>
                        <button
                          onClick={() => handleToggleAdicional(adicional.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: All Adicionales Catalog */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Catálogo de adicionales</span>
              <p className="text-xs text-text-muted mt-0.5">
                {allAdicionales.length} adicionales disponibles
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {allAdicionales.map((adicional) => {
                const isOn = dailyAdicionalIds.includes(adicional.id);
                return (
                  <button
                    key={adicional.id}
                    onClick={() => handleToggleAdicional(adicional.id)}
                    className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isOn
                      ? "bg-primary/[0.03] border-primary/30 shadow-sm hover:border-primary/50"
                      : "bg-white border-transparent hover:border-border hover:shadow-sm"
                      }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${isOn
                        ? "bg-primary border-primary text-white"
                        : "bg-white border border-border group-hover:border-primary/40 text-transparent"
                        }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${isOn ? "text-primary" : "text-text-main"}`}>
                        {adicional.name}
                      </p>
                      <p className="text-xs font-semibold text-price-green mt-0.5">
                        {formatRef(adicional.priceUsdCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bebidas Tab */}
      {activeTab === "bebidas" && (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
          {/* LEFT: Active Bebidas */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Bebidas activas hoy</span>
              <p className="text-xs text-text-muted mt-0.5">
                {dailyBebidaIds.length > 0
                  ? `${dailyBebidaIds.length} bebida${dailyBebidaIds.length !== 1 ? "s" : ""} seleccionada${dailyBebidaIds.length !== 1 ? "s" : ""}`
                  : "Ninguna bebida seleccionada"}
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
              <button
                onClick={() => handleShiftDay(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium text-text-main">
                {dateLabel}
              </span>
              <button
                onClick={() => handleShiftDay(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white/50">
              {dailyBebidaIds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                    <Coffee className="h-6 w-6 text-text-muted/50" />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed max-w-[150px]">
                    Selecciona bebidas del catálogo para hoy.
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-1">
                  {allBebidas
                    .filter((b) => dailyBebidaIds.includes(b.id))
                    .map((bebida) => (
                      <div
                        key={bebida.id}
                        className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-border/40 hover:border-error/30 hover:shadow-sm transition-all"
                      >
                        <span className="flex-1 text-xs font-medium text-text-main truncate">
                          {bebida.name}
                        </span>
                        <span className="text-[10px] font-semibold text-price-green">
                          {formatRef(bebida.priceUsdCents)}
                        </span>
                        <button
                          onClick={() => handleToggleBebida(bebida.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: All Bebidas Catalog */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Catálogo de bebidas</span>
              <p className="text-xs text-text-muted mt-0.5">
                {allBebidas.length} bebidas disponibles
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {allBebidas.map((bebida) => {
                const isOn = dailyBebidaIds.includes(bebida.id);
                return (
                  <button
                    key={bebida.id}
                    onClick={() => handleToggleBebida(bebida.id)}
                    className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isOn
                      ? "bg-primary/[0.03] border-primary/30 shadow-sm hover:border-primary/50"
                      : "bg-white border-transparent hover:border-border hover:shadow-sm"
                      }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${isOn
                        ? "bg-primary border-primary text-white"
                        : "bg-white border border-border group-hover:border-primary/40 text-transparent"
                        }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${isOn ? "text-primary" : "text-text-main"}`}>
                        {bebida.name}
                      </p>
                      <p className="text-xs font-semibold text-price-green mt-0.5">
                        {formatRef(bebida.priceUsdCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Contornos Tab */}
      {activeTab === "contornos" && (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
          {/* LEFT: Active Contornos */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Contornos activos hoy</span>
              <p className="text-xs text-text-muted mt-0.5">
                {dailyContornoIds.length > 0
                  ? `${dailyContornoIds.length} contorno${dailyContornoIds.length !== 1 ? "s" : ""} seleccionado${dailyContornoIds.length !== 1 ? "s" : ""}`
                  : "Ningún contorno seleccionado"}
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
              <button
                onClick={() => handleShiftDay(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium text-text-main">
                {dateLabel}
              </span>
              <button
                onClick={() => handleShiftDay(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white/50">
              {dailyContornoIds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                    <UtensilsCrossed className="h-6 w-6 text-text-muted/50" />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed max-w-[150px]">
                    Selecciona contornos del catálogo para hoy.
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-1">
                  {allContornos
                    .filter((c) => dailyContornoIds.includes(c.id))
                    .map((contorno) => (
                      <div
                        key={contorno.id}
                        className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-border/40 hover:border-error/30 hover:shadow-sm transition-all"
                      >
                        <span className="flex-1 text-xs font-medium text-text-main truncate">
                          {contorno.name}
                        </span>
                        <span className="text-[10px] font-semibold text-price-green">
                          {formatRef(contorno.priceUsdCents)}
                        </span>
                        <button
                          onClick={() => handleToggleContorno(contorno.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: All Contornos Catalog */}
          <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b flex-shrink-0 bg-bg-app/40">
              <span className="text-sm font-semibold text-text-main">Catálogo de contornos</span>
              <p className="text-xs text-text-muted mt-0.5">
                {allContornos.length} contornos disponibles
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {allContornos.map((contorno) => {
                const isOn = dailyContornoIds.includes(contorno.id);
                return (
                  <button
                    key={contorno.id}
                    onClick={() => handleToggleContorno(contorno.id)}
                    className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isOn
                      ? "bg-primary/[0.03] border-primary/30 shadow-sm hover:border-primary/50"
                      : "bg-white border-transparent hover:border-border hover:shadow-sm"
                      }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${isOn
                        ? "bg-primary border-primary text-white"
                        : "bg-white border border-border group-hover:border-primary/40 text-transparent"
                        }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${isOn ? "text-primary" : "text-text-main"}`}>
                        {contorno.name}
                      </p>
                      <p className="text-xs font-semibold text-price-green mt-0.5">
                        {formatRef(contorno.priceUsdCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}