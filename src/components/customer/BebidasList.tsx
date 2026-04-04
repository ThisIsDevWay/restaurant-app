"use client";

import { Minus, Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
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
    <div className="border-b border-border px-4 py-3">
      <h3 className="mb-1 text-[14px] font-semibold text-text-main">
        Bebidas del día
      </h3>
      <p className="mb-2 text-[11px] text-text-muted">
        Bebidas disponibles hoy
      </p>
      <div className="flex flex-col gap-1">
        {dailyBebidas.map((bebida) => {
          const qty = quantities[bebida.id] ?? 0;

          return (
            <div
              key={bebida.id}
              className="flex items-center justify-between rounded-lg px-1 py-2"
            >
              {/* Left: Name + price */}
              <div className="flex flex-col">
                <span className="text-[14px] text-text-main">
                  {bebida.name}
                </span>
                {bebida.priceUsdCents === 0 ? (
                  <span className="text-[11px] text-text-muted">Incluido</span>
                ) : (
                  <span className="text-[11px] text-text-muted">
                    +{formatBs(Math.round(bebida.priceUsdCents * currentRateBsPerUsd))}
                    {" / "}
                    {formatRef(bebida.priceUsdCents)}
                  </span>
                )}
              </div>

              {/* Right: Stepper control */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onUpdateQty(bebida.id, -1)}
                  disabled={qty === 0}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${qty > 0
                    ? "border-primary text-primary active:bg-primary/10"
                    : "border-border text-text-muted/40"
                    }`}
                  aria-label={`Quitar ${bebida.name}`}
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
                  onClick={() => onUpdateQty(bebida.id, 1)}
                  disabled={qty >= maxQuantityPerItem}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${qty < maxQuantityPerItem ? "bg-primary text-white active:bg-primary-hover" : "bg-border text-text-muted/40"}`}
                  aria-label={`Agregar ${bebida.name}`}
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
