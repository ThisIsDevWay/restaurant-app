"use client";

import { Check } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import type { SimpleItem } from "./ItemDetailModal.types";

interface BebidasListProps {
  dailyBebidas: SimpleItem[];
  selectedBebidaIds: Set<string>;
  onToggle: (bebidaId: string) => void;
  currentRateBsPerUsd: number;
}

export function BebidasList({
  dailyBebidas,
  selectedBebidaIds,
  onToggle,
  currentRateBsPerUsd,
}: BebidasListProps) {
  if (dailyBebidas.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <h3 className="mb-2 text-[14px] font-semibold text-text-main">
        Bebidas del día
      </h3>
      <p className="mb-2 text-[11px] text-text-muted">
        Bebidas disponibles hoy
      </p>
      <div className="flex flex-col gap-0.5">
        {dailyBebidas.map((bebida) => {
          const isChecked = selectedBebidaIds.has(bebida.id);
          return (
            <button
              key={bebida.id}
              onClick={() => onToggle(bebida.id)}
              className="flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors active:bg-bg-app"
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
                  {bebida.name}
                </span>
              </div>
              <div className="text-right text-[12px] text-text-muted leading-tight">
                {bebida.priceUsdCents === 0 ? (
                  <span>Incluido</span>
                ) : (
                  <>
                    <div>
                      +{formatBs(Math.round(bebida.priceUsdCents * currentRateBsPerUsd))}
                    </div>
                    <div className="text-[10px] opacity-80">
                      / {formatRef(bebida.priceUsdCents)}
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
