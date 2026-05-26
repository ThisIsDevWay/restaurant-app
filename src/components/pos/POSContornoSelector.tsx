"use client";

import { Check } from "lucide-react";
import { formatBs } from "@/lib/money";
import type { SimpleComponent } from "@/types/menu.types";

interface POSContornoSelectorProps {
  /** The dish's contornos that are available today. */
  availableContornos: SimpleComponent[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  rate: number;
}

/**
 * Touch-first contorno picker for the internal POS. Intentionally has NO business
 * logic: every available contorno is a free toggle chip — no slots, no swap rules,
 * no min/max. Staff is responsible for applying real-world rules; the system does
 * not enforce them. Selected contornos are stored as fixedContornos on the cart item.
 */
export function POSContornoSelector({
  availableContornos,
  selectedIds,
  onToggle,
  rate,
}: POSContornoSelectorProps) {
  if (availableContornos.length === 0) return null;

  return (
    <section className="px-5 py-4">
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Contornos
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {availableContornos.map((c) => {
          const selected = selectedIds.has(c.id);
          const priceBs = Math.round(c.priceUsdCents * rate);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left transition-transform duration-75 active:scale-95 ${
                selected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-[var(--color-border)] bg-white"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-bold ${
                    selected ? "text-emerald-900" : "text-[var(--color-text-main)]"
                  }`}
                >
                  {c.name}
                </span>
                {c.priceUsdCents > 0 && (
                  <span className="block text-[10px] font-bold text-[var(--color-text-muted)]">
                    +{formatBs(priceBs)}
                  </span>
                )}
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-[var(--color-border)] bg-white text-transparent"
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
