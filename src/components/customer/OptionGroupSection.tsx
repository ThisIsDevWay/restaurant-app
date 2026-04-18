"use client";

import { formatBs } from "@/lib/money";
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
          className="border-b border-border px-4 py-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-[14px] font-semibold text-text-main">
              {group.name}
            </h3>
            <span
              className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${group.required
                ? "bg-error/10 text-error"
                : "bg-border text-text-muted"
                }`}
            >
              {group.required ? "OBLIGATORIO" : "OPCIONAL"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {group.options
              .filter((o) => o.isAvailable)
              .map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSelectRadio(group.id, option.id)}
                  className="flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors active:bg-bg-app"
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selectedRadio[group.id] === option.id
                      ? "border-primary bg-primary"
                      : "border-input"
                      }`}
                  >
                    {selectedRadio[group.id] === option.id && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="flex-1 text-[14px] text-text-main">
                    {option.name}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    {option.priceUsdCents === 0
                      ? "Incluido"
                      : `+${formatBs(
                        Math.round(
                          option.priceUsdCents * currentRateBsPerUsd,
                        ),
                      )}`}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}
