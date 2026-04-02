"use client";

import { LucideIcon, CheckCircle2, X } from "lucide-react";
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
    <div className="grid grid-cols-[1fr_1.6fr] gap-4 min-h-[520px]">
      {/* LEFT: Active Items */}
      <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-bg-app/40">
          <span className="text-sm font-semibold text-text-main">{activeLabel}</span>
          <p className="text-xs text-text-muted mt-0.5">
            {activeIds.length > 0
              ? `${activeIds.length} ${title.toLowerCase()}${activeIds.length !== 1 ? "s" : ""} seleccionado${activeIds.length !== 1 ? "s" : ""}`
              : `Ningún ${title.toLowerCase()} seleccionado`}
          </p>
        </div>

        <DateNavigator
          dateLabel={dateLabel}
          onPrev={() => onShiftDay(-1)}
          onNext={() => onShiftDay(1)}
        />

        <div className="flex-1 overflow-y-auto bg-white/50">
          {activeIds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-app/60 mb-3 ring-1 ring-border shadow-sm">
                <EmptyIcon className="h-6 w-6 text-text-muted/50" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed max-w-[150px]">
                {emptyText}
              </p>
            </div>
          ) : (
            <div className="px-3 py-2 space-y-1">
              {allItems
                .filter((item) => activeIds.includes(item.id))
                .map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-border/40 hover:border-error/30 hover:shadow-sm transition-all"
                  >
                    <span className="flex-1 text-xs font-medium text-text-main truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-semibold text-price-green">
                      {formatRef(item.priceUsdCents)}
                    </span>
                    <button
                      onClick={() => onToggle(item.id)}
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

      {/* RIGHT: Full Catalog */}
      <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b flex-shrink-0 bg-bg-app/40">
          <span className="text-sm font-semibold text-text-main">{catalogLabel}</span>
          <p className="text-xs text-text-muted mt-0.5">
            {allItems.length} {title.toLowerCase()}s disponibles
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {allItems.map((item) => {
            const isOn = activeIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onToggle(item.id)}
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
    </div>
  );
}
