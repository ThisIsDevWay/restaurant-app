"use client";

import { LucideIcon, X } from "lucide-react";
import { formatRef } from "@/lib/money";
import { DateNavigator } from "@/components/shared/DateNavigator";
import type { SimpleItem } from "./DailyMenu.types";

interface DailyMenuSimpleTabProps {
  title: string;
  activeLabel: string;
  catalogLabel: string;
  activeItems: SimpleItem[];
  allItems: SimpleItem[];
  activeIds: string[];
  onToggle: (id: string) => void;
  dateLabel: string;
  onShiftDay: (days: number) => void;
  emptyIcon: LucideIcon;
  emptyText: string;
}

export function DailyMenuSimpleTab({
  title,
  activeLabel,
  catalogLabel,
  activeItems,
  allItems,
  activeIds,
  onToggle,
  dateLabel,
  onShiftDay,
  emptyIcon: EmptyIcon,
  emptyText,
}: DailyMenuSimpleTabProps) {
  return (
    <>
      <style>{`
        .dmst-col {
          display: flex; flex-direction: column;
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 20px;
          overflow: hidden;
        }
        .dmst-col-header {
          padding: 16px 20px 14px;
          border-bottom: 1px solid #f0e6df;
          flex-shrink: 0;
          background: #fff8f3;
        }
        .dmst-col-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700; color: #251a07;
          margin: 0;
        }
        .dmst-col-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #9c8c78;
          margin: 3px 0 0;
        }
        .dmst-scroll { flex: 1; overflow-y: auto; padding: 10px 12px; }
        .dmst-active-row {
          display: flex; align-items: center; gap: 10;
          padding: 9px 12px;
          background: #fff8f3; border: 1px solid #f0e6df;
          border-radius: 10px; margin-bottom: 6px;
          transition: border-color 0.13s ease;
        }
        .dmst-active-row:hover { border-color: #f5c5c8; }
        .dmst-remove-btn {
          width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid #f0e6df;
          cursor: pointer; color: #9c8c78;
          transition: all 0.13s ease; opacity: 0;
        }
        .dmst-active-row:hover .dmst-remove-btn { opacity: 1; }
        .dmst-remove-btn:hover { background: #fdeaec; border-color: #f5c5c8; color: #b00020; }
        .dmst-catalog-btn {
          display: flex; width: 100%; align-items: center; gap: 10px;
          padding: 9px 12px; margin-bottom: 5px;
          background: #fff8f3; border: 1.5px solid #ede0d8;
          border-radius: 12px; cursor: pointer; text-align: left;
          transition: all 0.13s ease; outline: none;
        }
        .dmst-catalog-btn-on {
          background: #fff; border-color: #bb0005;
        }
        .dmst-catalog-btn:not(.dmst-catalog-btn-on):hover { border-color: #d4a99f; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14, minHeight: 520 }}>

        {/* LEFT: Active */}
        <div className="dmst-col">
          <div className="dmst-col-header">
            <p className="dmst-col-title">{activeLabel}</p>
            <p className="dmst-col-sub">
              {activeIds.length > 0
                ? `${activeIds.length} ${title}${activeIds.length !== 1 ? "s" : ""} seleccionado${activeIds.length !== 1 ? "s" : ""}`
                : `Ningún ${title} seleccionado`}
            </p>
          </div>

          <DateNavigator
            dateLabel={dateLabel}
            onPrev={() => onShiftDay(-1)}
            onNext={() => onShiftDay(1)}
          />

          <div className="dmst-scroll">
            {activeIds.length === 0 ? (
              <div style={{
                height: "100%", minHeight: 120,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: "24px 16px", gap: 10,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#fff2e2", border: "1px solid #f0e6df",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <EmptyIcon size={20} color="#c4b09a" />
                </div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12, color: "#9c8c78", margin: 0, maxWidth: 150,
                  lineHeight: 1.5,
                }}>
                  {emptyText}
                </p>
              </div>
            ) : (
              allItems
                .filter((item) => activeIds.includes(item.id))
                .map((item) => (
                  <div key={item.id} className="dmst-active-row" style={{ gap: 10 }}>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13, fontWeight: 600, color: "#251a07",
                      flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.name}
                    </span>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 11, fontWeight: 700, color: "#1a7a45",
                      flexShrink: 0,
                    }}>
                      {formatRef(item.priceUsdCents)}
                    </span>
                    <button
                      className="dmst-remove-btn"
                      onClick={() => onToggle(item.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* RIGHT: Catalog */}
        <div className="dmst-col">
          <div className="dmst-col-header">
            <p className="dmst-col-title">{catalogLabel}</p>
            <p className="dmst-col-sub">
              {allItems.length} {title}s disponibles
            </p>
          </div>

          <div className="dmst-scroll">
            {allItems.map((item) => {
              const isOn = activeIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  className={`dmst-catalog-btn ${isOn ? "dmst-catalog-btn-on" : ""}`}
                  onClick={() => onToggle(item.id)}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isOn ? "#bb0005" : "#fff",
                    border: `2px solid ${isOn ? "#bb0005" : "#d4c5bc"}`,
                    transition: "all 0.13s ease",
                  }}>
                    {isOn && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13, fontWeight: 600, margin: 0,
                      color: isOn ? "#bb0005" : "#251a07",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      transition: "color 0.13s ease",
                    }}>
                      {item.name}
                    </p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 11, fontWeight: 700, color: "#1a7a45",
                      margin: "2px 0 0",
                    }}>
                      {formatRef(item.priceUsdCents)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}