"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBs, formatRef } from "@/lib/money";
import type { CartItem } from "@/store/cartStore";
import type { SurchargeResult } from "@/hooks/useCheckoutSurcharges";

interface WizardCartChipProps {
  cartItems: CartItem[];
  totalPlatos: number;
  grandTotalUsdCents: number;
  grandTotalBsCents: number;
  surcharges: SurchargeResult;
  cartOpen: boolean;
  onOpenCart: () => void;
  onCloseCart: () => void;
}

function MiniPlate({ item, index }: { item: CartItem; index: number }) {
  return (
    <div
      className="w-7 h-7 rounded-full border-2 border-bg-app overflow-hidden bg-surface-section flex items-center justify-center text-[13px] shrink-0"
      style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 3 - index }}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <span>{item.emoji ?? "🍽️"}</span>
      )}
    </div>
  );
}

export function WizardCartChip({
  cartItems,
  totalPlatos,
  grandTotalUsdCents,
  grandTotalBsCents,
  surcharges,
  cartOpen,
  onOpenCart,
  onCloseCart,
}: WizardCartChipProps) {
  const visibleItems = cartItems.slice(0, 3);
  const extraCount = cartItems.length > 3 ? cartItems.length - 3 : 0;

  return (
    <>
      {/* Chip bar */}
      <button
        onClick={onOpenCart}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface-section border-b border-border text-left cursor-pointer active:bg-[#ffe8d6]/60 transition-colors"
        aria-label="Ver pedido"
      >
        {/* Mini-plates overlapping */}
        <div className="flex items-center">
          {visibleItems.map((item, i) => (
            <MiniPlate key={item.id} item={item} index={i} />
          ))}
          {extraCount > 0 && (
            <div
              className="w-7 h-7 rounded-full border-2 border-bg-app bg-surface-section flex items-center justify-center text-[10px] font-bold text-text-muted"
              style={{ marginLeft: -10, zIndex: 0 }}
            >
              +{extraCount}
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="flex-1 leading-[1.1]">
          <div className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted">
            Tu pedido
          </div>
          <div className="font-sans text-[13px] font-semibold text-text-main">
            {totalPlatos} {totalPlatos === 1 ? "plato" : "platos"} · Ver detalle
          </div>
        </div>

        {/* Chevron up */}
        <ChevronRight className="w-4 h-4 text-text-muted -rotate-90 shrink-0" />
      </button>

      {/* Bottom sheet overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-[rgba(20,16,12,0.45)] z-40 transition-opacity duration-[320ms]",
          cartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onCloseCart}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 flex flex-col bg-bg-app rounded-t-[28px] shadow-modal max-h-[88dvh]",
          "transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          cartOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-0">
          <div className="w-9 h-1 bg-border rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-start justify-between px-5 pt-3 pb-1.5">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted">
              Tu pedido
            </p>
            <p className="font-display text-[26px] font-bold text-text-main leading-tight tracking-[-0.02em]">
              {totalPlatos} {totalPlatos === 1 ? "plato" : "platos"}
            </p>
          </div>
          <button
            onClick={onCloseCart}
            className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-main mt-0.5 active:bg-surface-section transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2.5 space-y-2.5">
          {cartItems.map((item) => {
            const extrasLine = buildExtrasLine(item);
            const noteLine = buildNoteLine(item);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-bg-card border border-border"
              >
                {/* Plate image 48×48 */}
                <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-section flex items-center justify-center text-[22px] shrink-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{item.emoji ?? "🍽️"}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1.5">
                    <p className="font-display text-[17px] text-text-main leading-[1.05] truncate">
                      {item.quantity}× {item.name}
                    </p>
                    <p className="font-sans text-[13px] font-semibold text-text-main shrink-0 tabular-nums">
                      {formatRef(computeItemUsdCents(item))}
                    </p>
                  </div>

                  {extrasLine && (
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                      {extrasLine}
                    </p>
                  )}

                  {noteLine && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-[6px] bg-surface-section text-[10px] text-text-muted italic">
                      &quot;{noteLine}&quot;
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Totals block */}
          <div className="mt-4 px-1 space-y-0">
            <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
              <span>Subtotal</span>
              <span className="font-semibold text-text-main tabular-nums">
                {formatRef(grandTotalUsdCents - surcharges.totalSurchargeUsdCents)}
              </span>
            </div>

            {surcharges.deliveryUsdCents > 0 && (
              <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
                <span>Delivery</span>
                <span className="font-semibold text-text-main tabular-nums">
                  +{formatRef(surcharges.deliveryUsdCents)}
                </span>
              </div>
            )}

            {surcharges.packagingUsdCents > 0 && (
              <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
                <span>Envases</span>
                <span className="font-semibold text-text-main tabular-nums">
                  +{formatRef(surcharges.packagingUsdCents)}
                </span>
              </div>
            )}

            <div className="border-t border-dashed border-border/60 my-2" />

            <div className="flex justify-between items-baseline">
              <span className="font-sans text-[13px] font-bold text-text-main uppercase tracking-widest">
                Total
              </span>
              <div className="text-right">
                <p className="font-sans text-[16px] font-bold text-text-main tabular-nums">
                  {formatRef(grandTotalUsdCents)}
                </p>
                <p className="font-sans text-[12px] text-text-muted tabular-nums mt-0.5">
                  ≈ {formatBs(grandTotalBsCents)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function computeItemUsdCents(item: CartItem): number {
  const fixedUsd = (item.fixedContornos ?? []).reduce((s, c) => s + c.priceUsdCents, 0);
  const subsUsd = (item.contornoSubstitutions ?? []).reduce((s, c) => s + c.priceUsdCents, 0);
  const adicUsd = (item.selectedAdicionales ?? []).reduce((s, a) => s + a.priceUsdCents * (a.quantity ?? 1), 0);
  const bebUsd = (item.selectedBebidas ?? []).reduce((s, b) => s + b.priceUsdCents * (b.quantity ?? 1), 0);
  const remUsd = (item.removedComponents ?? []).reduce((s, r) => s + r.priceUsdCents, 0);
  return (item.baseUsdCents + fixedUsd + subsUsd - remUsd) * item.quantity + adicUsd + bebUsd;
}

function buildExtrasLine(item: CartItem): string {
  const parts: string[] = [];

  (item.contornoSubstitutions ?? []).forEach((s) => {
    parts.push(`${s.originalName} → ${s.substituteName}`);
  });

  (item.selectedAdicionales ?? []).forEach((a) => {
    parts.push(a.name);
  });

  (item.selectedBebidas ?? []).forEach((b) => {
    parts.push(b.name);
  });

  (item.removedComponents ?? []).forEach((r) => {
    parts.push(`Sin ${r.name}`);
  });

  return parts.join(" · ");
}

function buildNoteLine(item: CartItem): string {
  if (item.includedNote) return item.includedNote;
  return "";
}
