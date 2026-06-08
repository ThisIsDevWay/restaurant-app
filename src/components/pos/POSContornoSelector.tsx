"use client";

import { formatBs } from "@/lib/money";
import type { SimpleComponent } from "@/types/menu.types";

interface POSContornoSelectorProps {
  /** The dish's contornos that are available today. */
  availableContornos: SimpleComponent[];
  selectedQuantities: Record<string, number>;
  onChange: (id: string, qty: number) => void;
  rate: number;
}

/**
 * Touch-first contorno picker for the internal POS. Intentionally has NO business
 * logic: every available contorno is a quantity stepper — no slots, no swap rules,
 * no min/max. Staff is responsible for applying real-world rules; the system does
 * not enforce them. Selected contornos are stored as fixedContornos on the cart item.
 */
export function POSContornoSelector({
  availableContornos,
  selectedQuantities,
  onChange,
  rate,
}: POSContornoSelectorProps) {
  if (availableContornos.length === 0) return null;

  const contornosDelDia = availableContornos.filter((c) => !c.alwaysShowIfAssigned);
  const contornosSiempreVisibles = availableContornos.filter((c) => c.alwaysShowIfAssigned);

  const renderContornoCard = (c: SimpleComponent) => {
    const qty = selectedQuantities[c.id] ?? 0;
    const priceBs = Math.round(c.priceUsdCents * rate);
    return (
      <div
        key={c.id}
        className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 transition-colors ${
          qty > 0
            ? "border-emerald-500 bg-emerald-50"
            : "border-[var(--color-border)] bg-white"
        }`}
      >
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-bold ${
              qty > 0 ? "text-emerald-900" : "text-[var(--color-text-main)]"
            }`}
          >
            {c.name}
          </span>
          {c.priceUsdCents > 0 && (
            <span className="block text-[10px] font-bold text-[var(--color-text-muted)]">
              +{formatBs(priceBs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {qty > 0 && (
            <button
              type="button"
              onClick={() => onChange(c.id, qty - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 bg-white text-emerald-600 font-bold transition-transform active:scale-90"
            >
              -
            </button>
          )}
          {qty > 0 && (
            <span className="min-w-[1.5rem] text-center text-sm font-black tabular-nums text-emerald-900">
              {qty}
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(c.id, qty + 1)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold transition-transform active:scale-90 ${
              qty > 0
                ? "bg-emerald-500 text-white"
                : "border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="px-5 py-4 space-y-5">
      {contornosDelDia.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Contornos del Día
          </h4>
          <div className="flex flex-col gap-2">
            {contornosDelDia.map(renderContornoCard)}
          </div>
        </div>
      )}

      {contornosSiempreVisibles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
            Contornos Siempre Visibles
          </h4>
          <div className="flex flex-col gap-2">
            {contornosSiempreVisibles.map(renderContornoCard)}
          </div>
        </div>
      )}
    </section>
  );
}
