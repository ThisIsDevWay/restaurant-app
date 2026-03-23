"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  syncDailyMenu,
  syncDailyAdicionales,
  syncDailyBebidas,
  copyDailyMenuFrom,
} from "@/actions/daily-menu";
import { formatRef } from "@/lib/money";

interface CatalogItem {
  id: string;
  name: string;
  categoryName: string;
  priceUsdCents: number;
  imageUrl: string | null;
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
  selectedDate: initialDate,
  today,
}: DailyMenuClientProps) {
  const router = useRouter();

  // Local state for UI
  const [dailyItemIds, setDailyItemIds] = useState<string[]>(initialDailyItemIds);
  const [dailyAdicionalIds, setDailyAdicionalIds] = useState<string[]>(initialDailyAdicionalIds);
  const [dailyBebidaIds, setDailyBebidaIds] = useState<string[]>(initialDailyBebidaIds);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [search, setSearch] = useState("");
  const [activePill, setActivePill] = useState<string>("Todos");
  const [copyDate, setCopyDate] = useState("");
  const [activeTab, setActiveTab] = useState<"platos" | "adicionales" | "bebidas">("platos");

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
          syncDailyMenu(selectedDate, dailyItemIds),
          syncDailyAdicionales(selectedDate, dailyAdicionalIds),
          syncDailyBebidas(selectedDate, dailyBebidaIds),
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
    const result = await copyDailyMenuFrom(copyDate, selectedDate);
    setCopying(false);
    if (result.success) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDailyItemIds, initialDailyAdicionalIds, initialDailyBebidaIds]);

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
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: dailyItemIds.length, label: "Platos activos" },
          { value: dailyAdicionalIds.length, label: "Adicionales" },
          { value: dailyBebidaIds.length, label: "Bebidas" },
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
          { key: "platos" as const, label: "Platos", icon: UtensilsCrossed },
          { key: "adicionales" as const, label: "Adicionales", icon: Plus },
          { key: "bebidas" as const, label: "Bebidas", icon: Coffee },
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
                          className="text-[10px] px-2 py-0.5 rounded-md text-error hover:bg-error/10 hover:text-error transition-colors"
                        >
                          Quitar todos
                        </button>
                      </div>

                      {/* Active Item Rows */}
                      <div className="px-3 py-2 space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-border/40 hover:border-error/30 hover:shadow-sm transition-all"
                          >
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-8 w-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-border/50"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-bg-app flex-shrink-0 ring-1 ring-border/50" />
                            )}
                            <span className="flex-1 text-xs font-medium text-text-main truncate">
                              {item.name}
                            </span>
                            <button
                              onClick={() => handleToggle(item.id)}
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
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

                      {/* Catalog Row Items */}
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
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
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
    </div>
  );
}