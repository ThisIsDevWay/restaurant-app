"use client";

import { Minus, Plus, X } from "lucide-react";
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
    <div className="shrink-0 border-t border-border/60 bg-bg-card px-5 py-5 shadow-[0_-8px_20px_rgba(37,26,7,0.03)]">
      <div className="mb-5 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => onQuantityChange((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-section/40 text-text-main transition-all hover:bg-surface-section active:scale-90"
            aria-label="Reducir cantidad"
          >
            <X className="hidden" /> {/* Placeholder to match plus if needed, but using icons directly */}
            <Minus className="h-4 w-4 stroke-[2.5]" />
          </button>
          <span className="w-10 text-center text-xl font-black tracking-tight text-[#251a07] font-display">
            {quantity}
          </span>
          <button
            onClick={() => onQuantityChange((q) => Math.min(maxQuantityPerItem, q + 1))}
            disabled={quantity >= maxQuantityPerItem}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-section/40 text-text-main transition-all hover:bg-surface-section active:scale-90 disabled:opacity-30"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
        {quantity > 1 && (
          <span className="max-w-[280px] animate-in slide-in-from-bottom-1 fade-in text-center text-[10px] font-bold uppercase tracking-wider text-text-muted/60 duration-300">
            Cada plato se añade individualmente
          </span>
        )}
      </div>

      <button
        onClick={onAdd}
        disabled={!allRequiredSatisfied}
        className={`w-full rounded-xl py-4 text-[15px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${allRequiredSatisfied
          ? "bg-primary text-white shadow-lg shadow-primary/20 active:bg-primary-hover"
          : "bg-border/60 text-text-muted cursor-not-allowed"
          }`}
      >
        {allRequiredSatisfied
          ? (
            <div className="flex items-center justify-center gap-2">
              <span>Agregar</span>
              <span className="opacity-40">|</span>
              <span>{formatBs(totalBsCents)}</span>
            </div>
          )
          : (unsatisfiedGroupName ?? "Selecciona una opción")
        }
      </button>
    </div >
  );
}
