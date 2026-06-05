"use client";

import { LucideIcon, X } from "lucide-react";
import { formatRef } from "@/lib/money";
import { DateNavigator } from "@/components/shared/DateNavigator";
import { SelectableItemRow } from "./SelectableItemRow";
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
  onAlwaysShowToggle?: (id: string, val: boolean) => void;
}

export function DailyMenuSimpleTab({
  title,
  activeLabel,
  catalogLabel,
  allItems,
  activeIds,
  onToggle,
  dateLabel,
  onShiftDay,
  emptyIcon: EmptyIcon,
  emptyText,
  onAlwaysShowToggle,
}: DailyMenuSimpleTabProps) {
  return (
    <div className="grid min-h-[520px] gap-3.5 lg:grid-cols-[1fr_1.6fr]">
      {/* LEFT: Active */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-card">
        <div className="flex-shrink-0 border-b border-border bg-bg-app px-5 py-3.5">
          <p className="text-[13px] font-bold text-text-main">{activeLabel}</p>
          <p className="mt-0.5 text-[11.5px] text-text-muted">
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

        <div className="flex-1 overflow-y-auto bg-bg-app p-3">
          {activeIds.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2.5 px-4 py-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-section">
                <EmptyIcon size={20} className="text-text-muted/70" />
              </div>
              <p className="max-w-[150px] text-xs leading-relaxed text-text-muted">{emptyText}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {allItems
                .filter((item) => activeIds.includes(item.id))
                .map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5 transition-colors hover:border-error/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-main">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-price-green">
                      {formatRef(item.priceUsdCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(item.id)}
                      aria-label={`Quitar ${item.name}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-text-muted opacity-0 transition-all hover:border-error/30 hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Catalog */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-card">
        <div className="flex-shrink-0 border-b border-border bg-bg-app px-5 py-3.5">
          <p className="text-[13px] font-bold text-text-main">{catalogLabel}</p>
          <p className="mt-0.5 text-[11.5px] text-text-muted">
            {allItems.length} {title}s disponibles
          </p>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {allItems.map((item) => (
            <SelectableItemRow
              key={item.id}
              name={item.name}
              priceUsdCents={item.priceUsdCents}
              selected={activeIds.includes(item.id)}
              onToggle={() => onToggle(item.id)}
              alwaysShowIfAssigned={item.alwaysShowIfAssigned}
              onAlwaysShowToggle={
                onAlwaysShowToggle
                  ? (val) => onAlwaysShowToggle(item.id, val)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
