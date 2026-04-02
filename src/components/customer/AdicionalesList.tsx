"use client";

import { Check } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import type { SimpleItem } from "./ItemDetailModal.types";

interface AdicionalesListProps {
  dailyAdicionales: SimpleItem[];
  selectedAdicionalIds: Set<string>;
  onToggle: (adicionalId: string) => void;
  activeSubstituteIds: Set<string>;
  currentRateBsPerUsd: number;
}

export function AdicionalesList({
  dailyAdicionales,
  selectedAdicionalIds,
  onToggle,
  activeSubstituteIds,
  currentRateBsPerUsd,
}: AdicionalesListProps) {
  if (dailyAdicionales.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <h3 className="mb-2 text-[14px] font-semibold text-text-main">
        Adicionales del día
      </h3>
      <p className="mb-2 text-[11px] text-text-muted">
        Extras disponibles hoy para cualquier plato
      </p>
      <div className="flex flex-col gap-0.5">
        {dailyAdicionales.map((adicional) => {
          const isChecked = selectedAdicionalIds.has(adicional.id);
          const isAlreadySubstitute = activeSubstituteIds.has(adicional.id);
          return (
            <button
              key={adicional.id}
              onClick={() => onToggle(adicional.id)}
              disabled={isAlreadySubstitute}
              className={`flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors ${isAlreadySubstitute ? "opacity-50 cursor-not-allowed" : "active:bg-bg-app"
                }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${isChecked
                  ? "border-primary bg-primary"
                  : "border-gray-400 bg-white"
                  }`}
              >
                {isChecked && (
                  <Check
                    className="h-3 w-3 text-white"
                    strokeWidth={3}
                  />
                )}
              </div>
              <div className="flex-1">
                <span className="text-[14px] text-text-main">
                  {adicional.name}
                </span>
                {isAlreadySubstitute && (
                  <p className="text-[11px] text-primary/70">
                    Ya incluido como contorno
                  </p>
                )}
              </div>
              <div className="text-right text-[12px] text-text-muted leading-tight">
                {adicional.priceUsdCents === 0 ? (
                  <span>Incluido</span>
                ) : (
                  <>
                    <div>
                      +{formatBs(Math.round(adicional.priceUsdCents * currentRateBsPerUsd))}
                    </div>
                    <div className="text-[10px] opacity-80">
                      / {formatRef(adicional.priceUsdCents)}
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
