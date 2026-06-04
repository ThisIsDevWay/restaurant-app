"use client";

import { Minus, Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { Stepper } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import type { SimpleItem } from "./ItemDetailModal.types";

interface BebidasListProps {
  dailyBebidas: SimpleItem[];
  quantities: Record<string, number>;
  onUpdateQty: (bebidaId: string, delta: number) => void;
  currentRateBsPerUsd: number;
  maxQuantityPerItem: number;
}

export function BebidasList({
  dailyBebidas,
  quantities,
  onUpdateQty,
  currentRateBsPerUsd,
  maxQuantityPerItem,
}: BebidasListProps) {
  if (dailyBebidas.length === 0) return null;

  return (
    <div className="border-t border-border/50 px-4 py-6 md:border-t-0 md:border-b md:border-border md:px-4 md:py-3">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <h3 className="font-display mb-1 text-[14px] font-semibold text-text-main">
          Bebidas del día
        </h3>
        <p className="mb-2 text-[11px] text-text-muted">
          Bebidas disponibles hoy
        </p>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between">
          <h3 className="font-epilogue font-semibold text-base text-text-main">
            Bebidas del día
          </h3>
          <span className="text-xs text-text-muted font-medium">Opcional</span>
        </div>
        <p className="text-sm text-text-muted mt-1 mb-4">
          Bebidas disponibles hoy
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {dailyBebidas
          .filter((bebida) => bebida.isAvailable)
          .map((bebida) => {
            const qty = quantities[bebida.id] ?? 0;

            return (
              <div key={bebida.id}>
                {/* Desktop layout (unchanged) */}
                <div
                  className="hidden md:flex items-center justify-between rounded-lg px-1 py-1.5 transition-colors active:bg-surface-section"
                >
                  <div className="flex flex-col">
                    <span className="text-[14px] text-text-main">
                      {bebida.name}
                    </span>
                    {bebida.priceUsdCents === 0 ? (
                      <span className="text-[11px] text-text-muted">Incluido</span>
                    ) : (
                      <span className="text-[11px] text-text-muted">
                        +{formatBs(Math.round(bebida.priceUsdCents * currentRateBsPerUsd), { rounded: true })}
                        {" / "}
                        {formatRef(bebida.priceUsdCents)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onUpdateQty(bebida.id, -1)}
                      disabled={qty === 0}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        qty > 0
                          ? "border-primary text-primary active:bg-primary/10"
                          : "border-border text-text-muted/40"
                      }`}
                      aria-label={`Quitar ${bebida.name}`}
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
                      onClick={() => onUpdateQty(bebida.id, 1)}
                      disabled={qty >= maxQuantityPerItem}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                        qty < maxQuantityPerItem ? "bg-primary text-white active:bg-primary-hover" : "bg-border text-text-muted/40"
                      }`}
                      aria-label={`Agregar ${bebida.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Mobile layout (Heritage Editorial) */}
                <div
                  className={cn(
                    "flex md:hidden items-center justify-between rounded-xl px-3 py-3.5 transition-all border border-transparent",
                    qty > 0 && "bg-surface-section border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-[14px] font-medium text-text-main">
                      {bebida.name}
                    </span>
                  </div>
 
                  <div className="flex items-center gap-3 shrink-0">
                    {bebida.priceUsdCents > 0 ? (
                      <div className="text-right">
                        <span className="text-[13px] font-bold text-text-main">
                          +{formatBs(Math.round(bebida.priceUsdCents * currentRateBsPerUsd), { rounded: true })}
                        </span>
                        <span className="block text-[10px] text-text-muted font-medium">
                          {formatRef(bebida.priceUsdCents)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] font-medium text-text-muted mr-1">
                        Incluido
                      </span>
                    )}

                    <Stepper
                      value={qty}
                      min={0}
                      max={maxQuantityPerItem}
                      onChange={(newQty) => onUpdateQty(bebida.id, newQty - qty)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
