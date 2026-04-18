"use client";

import { Minus, Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
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
    <div className="border-b border-border px-4 py-3">
      <h3 className="font-display mb-1 text-[14px] font-semibold text-text-main">
        Adicionales del día
      </h3>
      <p className="mb-2 text-[11px] text-text-muted">
        Extras disponibles hoy para cualquier plato
      </p>
      <div className="flex flex-col gap-1">
        {dailyAdicionales.map((adicional) => {
          const isAlreadySubstitute = activeSubstituteIds.has(adicional.id);
          const qty = quantities[adicional.id] ?? 0;

          return (
            <div
              key={adicional.id}
              className={`flex items-center justify-between rounded-lg px-1 py-1.5 transition-colors active:bg-surface-section ${isAlreadySubstitute ? "opacity-50" : ""
                }`}
            >
              {/* Left: Name + price */}
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

              {/* Right: Stepper control */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onUpdateQty(adicional.id, -1)}
                  disabled={isAlreadySubstitute || qty === 0}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${qty > 0 && !isAlreadySubstitute
                    ? "border-primary text-primary active:bg-primary/10"
                    : "border-border text-text-muted/40"
                    }`}
                  aria-label={`Quitar ${adicional.name}`}
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <span
                  className={`w-4 text-center text-[14px] font-semibold ${qty > 0 ? "text-text-main" : "text-text-muted/60"
                    }`}
                >
                  {qty}
                </span>
                <button
                  onClick={() => onUpdateQty(adicional.id, 1)}
                  disabled={isAlreadySubstitute || qty >= maxQuantityPerItem}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${!isAlreadySubstitute && qty < maxQuantityPerItem
                    ? "bg-primary text-white active:bg-primary-hover"
                    : "bg-border text-text-muted/40"
                    }`}
                  aria-label={`Agregar ${adicional.name}`}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
