"use client";

import { Minus, Plus } from "lucide-react";
import { formatBs } from "@/lib/money";

interface ModalFooterProps {
  quantity: number;
  maxQuantityPerItem: number;
  onQuantityChange: (updater: (prev: number) => number) => void;
  onAdd: () => void;
  allRequiredSatisfied: boolean;
  unsatisfiedGroupName: string | undefined;
  extrasCount: number;
  totalBsCents: number;
}

export function ModalFooter({
  quantity,
  maxQuantityPerItem,
  onQuantityChange,
  onAdd,
  allRequiredSatisfied,
  unsatisfiedGroupName,
  extrasCount,
  totalBsCents,
}: ModalFooterProps) {
  return (
    <div className="shrink-0 border-t border-border bg-bg-card px-4 py-3 shadow-[0_-4px_16px_rgba(37,26,7,0.04)]">
      <div className="mb-3 flex flex-col items-center justify-center gap-1.5">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onQuantityChange((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-main transition-colors active:bg-bg-app"
            aria-label="Reducir cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-lg font-bold">
            {quantity}
          </span>
          <button
            onClick={() => onQuantityChange((q) => Math.min(maxQuantityPerItem, q + 1))}
            disabled={quantity >= maxQuantityPerItem}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors active:bg-primary-hover disabled:opacity-40"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {quantity > 1 && (
          <span className="max-w-[280px] animate-in slide-in-from-bottom-1 fade-in text-center text-[10px] leading-tight text-text-muted/90 duration-200">
            Para que cada plato tenga sus propios contornos o adicionales, agrégalos uno por uno.
          </span>
        )}
      </div>

      <button
        onClick={onAdd}
        disabled={!allRequiredSatisfied}
        className={`w-full rounded-input py-3 text-[15px] font-semibold transition-colors ${allRequiredSatisfied
          ? "bg-primary text-white active:bg-primary-hover"
          : "bg-border text-text-muted"
          }`}
      >
        {allRequiredSatisfied
          ? `Agregar${quantity > 1 ? ` ${quantity} Servicios` : ""}${extrasCount > 0 ? ` (${extrasCount} extra${extrasCount > 1 ? "s" : ""})` : ""} · ${formatBs(totalBsCents)}`
          : unsatisfiedGroupName ?? "Selecciona una opción"}
      </button>
    </div >
  );
}
