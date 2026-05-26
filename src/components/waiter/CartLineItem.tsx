"use client";

import { Minus, Plus, Pencil, Trash2 } from "lucide-react";
import { useCartStore, type CartItem } from "@/store/cartStore";
import { formatBs, formatRef } from "@/lib/money";

interface QtyControlProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
}

export function QtyControl({
  value,
  onDecrement,
  onIncrement,
  min = 1,
}: QtyControlProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDecrement}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary)] transition-colors active:bg-[var(--color-bg-app)] disabled:opacity-40"
        disabled={value <= min}
        aria-label="Reducir cantidad"
      >
        <Minus size={12} strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-[var(--color-text-main)]">
        {value}
      </span>
      <button
        onClick={onIncrement}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors active:bg-[var(--color-primary-hover)]"
        aria-label="Aumentar cantidad"
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface CartLineItemProps {
  item: CartItem;
  index: number;
  onEdit: () => void;
  /** POS screens pass their own store actions; public cart falls back to useCartStore. */
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onRemove?: (index: number) => void;
}

export function CartLineItem({ item, index, onEdit, onUpdateQuantity, onRemove }: CartLineItemProps) {
  const storeUpdateQuantity = useCartStore((s) => s.updateQuantity);
  const storeRemoveItem = useCartStore((s) => s.removeItem);
  const updateQuantity = onUpdateQuantity ?? storeUpdateQuantity;
  const removeItem = onRemove ?? storeRemoveItem;

  const fixedContornos = item.fixedContornos ?? [];
  const substitutions = item.contornoSubstitutions ?? [];
  const adicionales = item.selectedAdicionales ?? [];
  const bebidas = item.selectedBebidas ?? [];
  const removals = item.removedComponents ?? [];
  const hasDetails =
    fixedContornos.length > 0 ||
    substitutions.length > 0 ||
    adicionales.length > 0 ||
    bebidas.length > 0 ||
    removals.length > 0;

  // Compute line total in USD cents (mirrors cartStore logic)
  const fixedUsd = fixedContornos.reduce((s, c) => s + c.priceUsdCents, 0);
  const subUsd = substitutions.reduce((s, c) => s + c.priceUsdCents, 0);
  const adUsd = adicionales.reduce(
    (s, a) => s + a.priceUsdCents * (a.quantity ?? 1),
    0
  );
  const bebUsd = bebidas.reduce(
    (s, b) => s + b.priceUsdCents * (b.quantity ?? 1),
    0
  );
  const remUsd = removals.reduce((s, r) => s + r.priceUsdCents, 0);
  const lineUsdCents =
    (item.baseUsdCents + fixedUsd + subUsd - remUsd) * item.quantity +
    adUsd +
    bebUsd;

  return (
    <div className="rounded-xl border border-[var(--color-border-ghost)] bg-[var(--color-bg-app)] overflow-hidden">
      {/* Header: name + qty + remove */}
      <div className="flex items-center gap-2.5 px-3 py-1.5">
        <span className="text-lg leading-none shrink-0">{item.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[var(--color-text-main)] leading-tight line-clamp-1">
            {item.name}
          </p>
          <p className="text-[10px] font-bold text-[var(--color-primary)] mt-0.5">
            {formatBs(item.baseBsCents)} <span className="text-[var(--color-text-muted)] font-medium">/ und</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <QtyControl
            value={item.quantity}
            onDecrement={() => updateQuantity(index, item.quantity - 1)}
            onIncrement={() => updateQuantity(index, item.quantity + 1)}
          />
        </div>
        <div className="ml-1 flex items-center gap-0.5">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-app)] hover:text-[var(--color-primary)]"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => removeItem(index)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-error)]/40 transition-colors hover:bg-red-50 hover:text-[var(--color-error)]"
            aria-label="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Details: contornos, removals, adicionales, bebidas */}
      {hasDetails && (
        <div className="flex flex-col gap-0.5 px-3 pb-1.5 pt-1 border-t border-[var(--color-border-ghost)] bg-white/50">
          {/* Contornos */}
          {(fixedContornos.length > 0 || substitutions.length > 0) && (
            <div className="flex flex-wrap gap-1 items-start">
              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[60px] shrink-0 pt-0.5">
                Acompaña
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {fixedContornos.map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] bg-[var(--color-surface-section)] px-2 py-0.5 rounded-full font-bold text-[var(--color-text-main)] ring-1 ring-[var(--color-border-ghost)]"
                  >
                    {c.name}
                  </span>
                ))}
                {substitutions.map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-amber-50 px-2 py-0.5 rounded-full font-bold text-amber-800 ring-1 ring-amber-200"
                  >
                    <span className="line-through opacity-40 mr-1">{s.originalName}</span>
                    {s.substituteName}
                    {s.priceBsCents > 0 && (
                      <span className="ml-1 text-[9px] opacity-70">
                        (+{formatBs(s.priceBsCents)})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Removals */}
          {removals.length > 0 && (
            <div className="flex flex-wrap gap-1 items-start">
              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[60px] shrink-0 pt-0.5">
                Sin
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {removals.map((r) => (
                  <span
                    key={r.componentId}
                    className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full font-bold text-red-700 ring-1 ring-red-100 italic"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Adicionales */}
          {adicionales.length > 0 && (
            <div className="flex flex-wrap gap-1 items-start">
              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[60px] shrink-0 pt-0.5">
                Extras
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {adicionales.map((a) => (
                  <span
                    key={a.id}
                    className="text-[10px] bg-[var(--color-primary)]/5 px-2 py-0.5 rounded-full font-bold text-[var(--color-text-main)] ring-1 ring-[var(--color-primary)]/10"
                  >
                    <span className="text-[var(--color-primary)] mr-1">{a.quantity ?? 1}×</span>
                    {a.name}
                    {a.priceBsCents > 0 && (
                      <span className="ml-1 text-[9px] text-[var(--color-primary)] opacity-70">
                        (+{formatBs(a.priceBsCents * (a.quantity ?? 1))})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bebidas */}
          {bebidas.length > 0 && (
            <div className="flex flex-wrap gap-1 items-start">
              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[60px] shrink-0 pt-0.5">
                Bebidas
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {bebidas.map((b) => (
                  <span
                    key={b.id}
                    className="text-[10px] bg-[var(--color-text-main)]/5 px-2 py-0.5 rounded-full font-bold text-[var(--color-text-main)] ring-1 ring-[var(--color-text-main)]/10"
                  >
                    <span className="mr-1">{b.quantity ?? 1}×</span>
                    {b.name}
                    {b.priceBsCents > 0 && (
                      <span className="ml-1 text-[9px] text-[var(--color-text-muted)] font-bold">
                        (+{formatBs(b.priceBsCents * (b.quantity ?? 1))})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtotal footer */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-[var(--color-border-ghost)] bg-[var(--color-surface-section)]/30">
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">
          Subtotal {item.quantity > 1 && <span className="text-[var(--color-primary)]">({item.quantity} und)</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] tabular-nums">
            {formatRef(lineUsdCents)}
          </span>
          <span className="text-sm font-black text-[var(--color-text-main)] tabular-nums">
            {formatBs(item.itemTotalBsCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
