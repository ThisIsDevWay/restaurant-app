"use client";

import { formatBs, formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OptionGroup } from "./ItemDetailModal.types";

interface OptionGroupSectionProps {
  groups: OptionGroup[];
  selectedRadio: Record<string, string>;
  onSelectRadio: (groupId: string, optionId: string) => void;
  currentRateBsPerUsd: number;
}

export function OptionGroupSection({
  groups,
  selectedRadio,
  onSelectRadio,
  currentRateBsPerUsd,
}: OptionGroupSectionProps) {
  return (
    <>
      {groups.map((group) => (
        <div
          key={group.id}
          className="border-t border-[#f5ece0] px-4 py-6 md:border-t-0 md:border-b md:border-border md:px-4 md:py-3"
        >
          {/* Desktop Header */}
          <div className="hidden md:flex items-center gap-2 mb-2">
            <h3 className="font-display text-[14px] font-semibold text-text-main">
              {group.name}
            </h3>
            <span
              className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${
                group.required ? "bg-error/10 text-error" : "bg-border text-text-muted"
              }`}
            >
              {group.required ? "OBLIGATORIO" : "OPCIONAL"}
            </span>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-baseline justify-between mb-3">
            <h3 className="font-epilogue font-semibold text-base text-[#251a07]">
              {group.name}
            </h3>
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                group.required ? "text-[#bb0005]" : "text-[#251a07]/40"
              )}
            >
              {group.required ? "Obligatorio · Elige 1" : "Opcional"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {group.options
              .filter((o) => o.isAvailable)
              .map((option) => {
                const isSelected = selectedRadio[group.id] === option.id;

                return (
                  <div key={option.id}>
                    {/* Desktop Row */}
                    <button
                      onClick={() => onSelectRadio(group.id, option.id)}
                      className="hidden md:flex w-full items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors active:bg-bg-app"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected ? "border-primary bg-primary" : "border-input"
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="flex-1 text-[14px] text-text-main">
                        {option.name}
                      </span>
                      <span className="text-[12px] text-text-muted">
                        {option.priceUsdCents === 0
                          ? "Incluido"
                          : `+${formatBs(Math.round(option.priceUsdCents * currentRateBsPerUsd))}`}
                      </span>
                    </button>

                    {/* Mobile Row */}
                    <button
                      onClick={() => onSelectRadio(group.id, option.id)}
                      className={cn(
                        "flex md:hidden w-full items-center justify-between rounded-xl px-3 py-3.5 transition-all border border-transparent text-left",
                        isSelected && "bg-[#f5ece0]/40 border-l-2 border-l-[#bb0005]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected ? "border-[#bb0005] bg-[#bb0005]" : "border-[#251a07]/20"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-[14px] font-medium text-[#251a07] truncate">
                          {option.name}
                        </span>
                      </div>

                      <div className="shrink-0 pl-2">
                        {option.priceUsdCents > 0 ? (
                          <div className="text-right">
                            <span className="text-[13px] font-bold text-[#251a07]">
                              +{formatBs(Math.round(option.priceUsdCents * currentRateBsPerUsd))}
                            </span>
                            <span className="block text-[10px] text-[#251a07]/50 font-medium">
                              {formatRef(option.priceUsdCents)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] font-medium text-[#251a07]/60">
                            Incluido
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </>
  );
}
