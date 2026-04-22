"use client";

import { useMemo } from "react";
import { UtensilsCrossed, Search, Copy } from "lucide-react";
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
    <>
      <style>{`
        .dmpt-col {
          display: flex; flex-direction: column;
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 20px;
          overflow: hidden;
          min-height: 0;
        }
        .dmpt-col-header {
          padding: 14px 18px 12px;
          border-bottom: 1px solid #f0e6df;
          flex-shrink: 0;
          background: #fff8f3;
        }
        .dmpt-col-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700; color: #251a07;
          margin: 0;
        }
        .dmpt-col-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #9c8c78;
          margin: 3px 0 0;
        }

        .dmpt-cat-header {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 14px;
          background: rgba(255,248,243,0.95);
          border-top: 1px solid #f0e6df;
          border-bottom: 1px solid #f0e6df;
          position: sticky; top: 0; z-index: 10;
          backdrop-filter: blur(8px);
        }
        .dmpt-cat-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px; font-weight: 800;
          color: #9c8c78; text-transform: uppercase; letter-spacing: 0.08em;
          flex: 1;
        }
        .dmpt-cat-count {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          padding: 1px 7px; border-radius: 100px;
        }
        .dmpt-cat-action {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10.5px; font-weight: 700;
          padding: 3px 9px; border-radius: 100px;
          background: transparent; border: none; cursor: pointer;
          transition: all 0.13s ease;
        }

        .dmpt-search {
          position: relative;
          margin-bottom: 10px;
        }
        .dmpt-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #9c8c78; pointer-events: none;
        }
        .dmpt-search-input {
          width: 100%; height: 38px;
          padding: 0 12px 0 36px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 500; color: #251a07;
          background: #fff; border: 1.5px solid #ede0d8;
          border-radius: 10px; outline: none;
          transition: border-color 0.15s ease;
        }
        .dmpt-search-input::placeholder { color: #c4b09a; font-weight: 400; }
        .dmpt-search-input:focus { border-color: #bb0005; }

        .dmpt-pill {
          padding: 5px 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; font-weight: 600;
          border-radius: 100px;
          border: 1.5px solid transparent;
          cursor: pointer; flex-shrink: 0;
          transition: all 0.13s ease; white-space: nowrap;
        }
        .dmpt-pill-active { background: #bb0005; color: #fff; border-color: #bb0005; }
        .dmpt-pill-inactive { background: #fff; color: #5f5e5e; border-color: #ede0d8; }
        .dmpt-pill-inactive:hover { border-color: #bb0005; color: #bb0005; }

        .dmpt-copy-widget {
          padding: 12px 16px;
          border-top: 1px solid #f0e6df;
          background: #fff8f3;
          flex-shrink: 0;
        }
        .dmpt-copy-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px; font-weight: 700; color: #9c8c78;
          letter-spacing: 0.04em; text-transform: uppercase;
          display: flex; align-items: center; gap: 5px;
          margin-bottom: 8px;
        }
        .dmpt-copy-row { display: flex; gap: 8px; }
        .dmpt-date-input {
          flex: 2; min-width: 0; height: 34px;
          padding: 0 10px;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px;
          color: #251a07; background: #fff;
          border: 1.5px solid #ede0d8; border-radius: 9px; outline: none;
          transition: border-color 0.15s ease;
        }
        .dmpt-date-input:focus { border-color: #bb0005; }
        .dmpt-copy-btn {
          flex: 1; height: 34px;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700;
          color: #251a07; background: #fff;
          border: 1.5px solid #ede0d8; border-radius: 9px; cursor: pointer;
          transition: all 0.13s ease;
        }
        .dmpt-copy-btn:not(:disabled):hover { border-color: #bb0005; color: #bb0005; }
        .dmpt-copy-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .dmpt-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 40px 20px; gap: 10px;
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14, minHeight: 520 }}>

        {/* LEFT: Active items */}
        <div className="dmpt-col">
          <div className="dmpt-col-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p className="dmpt-col-title">Activos hoy</p>
              {dateBadge && (
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 10, fontWeight: 700,
                  background: "#eaf7f0", color: "#1a7a45",
                  padding: "2px 8px", borderRadius: 100,
                }}>
                  {dateBadge}
                </span>
              )}
            </div>
            <p className="dmpt-col-sub">
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

          <div style={{ flex: 1, overflowY: "auto", background: "#fff8f3" }}>
            {selectedItems.length === 0 ? (
              <div className="dmpt-empty">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#fff2e2", border: "1px solid #f0e6df",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <UtensilsCrossed size={20} color="#c4b09a" />
                </div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12, color: "#9c8c78", margin: 0,
                  maxWidth: 160, lineHeight: 1.5,
                }}>
                  Selecciona platos del catálogo para agregarlos a hoy.
                </p>
              </div>
            ) : (
              categories.map((cat) => {
                const items = selectedItems.filter((i) => i.categoryName === cat);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div className="dmpt-cat-header">
                      <span className="dmpt-cat-name">{cat}</span>
                      <span className="dmpt-cat-count" style={{
                        background: "#fff2e2", color: "#9c8c78",
                      }}>
                        {items.length}
                      </span>
                      <button
                        className="dmpt-cat-action"
                        style={{ color: "#b00020" }}
                        onClick={() => handleToggleCategory(cat, true)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fdeaec")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Quitar todos
                      </button>
                    </div>
                    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((item) => {
                        const currentContornos = itemContornoSelections[item.id] || [];
                        const availableDailyContornos = allContornos.filter((c) => dailyContornoIds.includes(c.id));
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

          {/* Copy widget */}
          <div className="dmpt-copy-widget">
            <p className="dmpt-copy-label">
              <Copy size={11} />
              Copiar menú desde
            </p>
            <div className="dmpt-copy-row">
              <input
                type="date"
                value={copyDate}
                onChange={(e) => onCopyDateChange(e.target.value)}
                className="dmpt-date-input"
              />
              <button
                className="dmpt-copy-btn"
                onClick={handleCopyFrom}
                disabled={!copyDate || copying}
              >
                {copying ? "Copiando..." : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Catalog */}
        <div className="dmpt-col">
          <div className="dmpt-col-header" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="dmpt-search">
              <Search size={15} className="dmpt-search-icon" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar plato en el catálogo..."
                className="dmpt-search-input"
              />
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {["Todos", ...categories].map((cat) => {
                const isActive = activePill === cat;
                const selCount = cat === "Todos"
                  ? dailyItemIds.length
                  : allItems.filter((i) => i.categoryName === cat && dailyItemIds.includes(i.id)).length;
                return (
                  <button
                    key={cat}
                    className={`dmpt-pill ${isActive ? "dmpt-pill-active" : "dmpt-pill-inactive"}`}
                    onClick={() => onPillChange(cat)}
                  >
                    {cat}
                    {selCount > 0 && (
                      <span style={{
                        marginLeft: 5, fontSize: 10, fontWeight: 800,
                        opacity: isActive ? 0.75 : 0.65,
                      }}>
                        {selCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredItems.length === 0 ? (
              <div className="dmpt-empty">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#fff2e2", border: "1px solid #f0e6df",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Search size={20} color="#c4b09a" />
                </div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 600, color: "#251a07", margin: 0,
                }}>
                  Sin resultados
                </p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12, color: "#9c8c78", margin: 0,
                }}>
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
                    <div className="dmpt-cat-header">
                      <span className="dmpt-cat-name">{cat}</span>
                      <span className="dmpt-cat-count" style={{
                        background: selInCat > 0 ? "#fdeaec" : "#f0e6df",
                        color: selInCat > 0 ? "#bb0005" : "#9c8c78",
                      }}>
                        {selInCat}/{items.length}
                      </span>
                      <button
                        className="dmpt-cat-action"
                        style={{ color: allOn ? "#b00020" : "#bb0005" }}
                        onClick={() => handleToggleCategory(cat)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = allOn ? "#fdeaec" : "#fff8f3";
                        }}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {allOn ? "Quitar todos" : "Seleccionar todos"}
                      </button>
                    </div>
                    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
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
    </>
  );
}