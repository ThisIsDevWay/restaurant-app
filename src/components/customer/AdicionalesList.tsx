"use client";

import { Minus, Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { Stepper } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import type { SimpleItem } from "./ItemDetailModal.types";

interface AdicionalesListProps {
  dailyAdicionales: SimpleItem[];
  quantities: Record<string, number>;
  onUpdateQty: (adicionalId: string, delta: number) => void;
  activeSubstituteIds: Set<string>;
  currentRateBsPerUsd: number;
  maxQuantityPerItem: number;
}

export function AdicionalesList({
  dailyAdicionales,
  quantities,
  onUpdateQty,
  activeSubstituteIds,
  currentRateBsPerUsd,
  maxQuantityPerItem,
}: AdicionalesListProps) {
  if (dailyAdicionales.length === 0) return null;

  return (
    <div className="border-t border-[#f5ece0] px-4 py-6 md:border-t-0 md:border-b md:border-border md:px-4 md:py-3">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <h3 className="font-display mb-1 text-[14px] font-semibold text-text-main">
          Adicionales del día
        </h3>
        <p className="mb-2 text-[11px] text-text-muted">
          Extras disponibles hoy para cualquier plato
        </p>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between">
          <h3 className="font-epilogue font-semibold text-base text-[#251a07]">
            Adicionales del día
          </h3>
          <span className="text-xs text-[#251a07]/40 font-medium">Opcional</span>
        </div>
        <p className="text-sm text-[#251a07]/50 mt-1 mb-4">
          Extras disponibles hoy para cualquier plato
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {dailyAdicionales
          .filter((adicional) => adicional.isAvailable)
          .map((adicional) => {
            const isAlreadySubstitute = activeSubstituteIds.has(adicional.id);
            const qty = quantities[adicional.id] ?? 0;

            return (
              <div key={adicional.id}>
                {/* Desktop layout (unchanged) */}
                <div
                  className={`hidden md:flex items-center justify-between rounded-lg px-1 py-1.5 transition-colors active:bg-surface-section ${
                    isAlreadySubstitute ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[14px] text-text-main">
                      {adicional.name}
                    </span>
                    {isAlreadySubstitute ? (
                      <span className="text-[11px] text-primary/70">
                        Ya incluido como contorno
                      </span>
                    ) : adicional.priceUsdCents === 0 ? (
                      <span className="text-[11px] text-text-muted">Incluido</span>
                    ) : (
                      <span className="text-[11px] text-text-muted">
                        +{formatBs(Math.round(adicional.priceUsdCents * currentRateBsPerUsd))}
                        {" / "}
                        {formatRef(adicional.priceUsdCents)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onUpdateQty(adicional.id, -1)}
                      disabled={isAlreadySubstitute || qty === 0}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        qty > 0 && !isAlreadySubstitute
                          ? "border-primary text-primary active:bg-primary/10"
                          : "border-border text-text-muted/40"
                      }`}
                      aria-label={`Quitar ${adicional.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <span
                      className={`w-4 text-center text-[14px] font-semibold ${
                        qty > 0 ? "text-text-main" : "text-text-muted/60"
                      }`}
                    >
                      {qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(adicional.id, 1)}
                      disabled={isAlreadySubstitute || qty >= maxQuantityPerItem}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                        !isAlreadySubstitute && qty < maxQuantityPerItem
                          ? "bg-primary text-white active:bg-primary-hover"
                          : "bg-border text-text-muted/40"
                      }`}
                      aria-label={`Agregar ${adicional.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Mobile layout (Heritage Editorial) */}
                <div
                  className={cn(
                    "flex md:hidden items-center justify-between rounded-xl px-3 py-3.5 transition-all border border-transparent",
                    qty > 0 && "bg-[#f5ece0]/60 border-l-2 border-l-[#bb0005]",
                    isAlreadySubstitute && "opacity-50"
                  )}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-[14px] font-medium text-[#251a07]">
                      {adicional.name}
                    </span>
                    {isAlreadySubstitute && (
                      <span className="text-[11px] text-[#bb0005]/70 font-medium mt-0.5">
                        Ya incluido como contorno
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {!isAlreadySubstitute && adicional.priceUsdCents > 0 && (
                      <div className="text-right">
                        <span className="text-[13px] font-bold text-[#251a07]">
                          +{formatBs(Math.round(adicional.priceUsdCents * currentRateBsPerUsd))}
                        </span>
                        <span className="block text-[10px] text-[#251a07]/50 font-medium">
                          {formatRef(adicional.priceUsdCents)}
                        </span>
                      </div>
                    )}
                    {!isAlreadySubstitute && adicional.priceUsdCents === 0 && (
                      <span className="text-[12px] font-medium text-[#251a07]/60 mr-1">
                        Incluido
                      </span>
                    )}

                    {!isAlreadySubstitute && (
                      <Stepper
                        value={qty}
                        min={0}
                        max={maxQuantityPerItem}
                        onChange={(newQty) => onUpdateQty(adicional.id, newQty - qty)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
