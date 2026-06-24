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
  step?: number;
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
  step,
}: WizardCartChipProps) {
  const visibleItems = cartItems.slice(0, 3);
  const extraCount = cartItems.length > 3 ? cartItems.length - 3 : 0;
  const isStep4 = step === 4;

  return (
    <>
      {/* Chip bar */}
      <button
        onClick={onOpenCart}
        className={cn(
          "w-full flex items-center text-left cursor-pointer active:bg-[#ffe8d6]/60 transition-colors",
          isStep4
            ? "px-4 py-2 bg-surface-section border-b border-border/60 justify-between gap-2"
            : "px-4 py-2.5 bg-surface-section border-b border-border gap-3"
        )}
        aria-label="Ver pedido"
      >
        {isStep4 ? (
          <div className="flex-1 leading-normal flex items-center justify-between">
            <span className="font-sans text-[13px] font-semibold text-text-main">
              Resumen del pedido
            </span>
            <span className="font-sans text-[12px] text-text-muted flex items-center gap-1">
              {totalPlatos} {totalPlatos === 1 ? "plato" : "platos"}
              <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 text-text-muted/70" />
            </span>
          </div>
        ) : (
          <>
            {/* Mini-plates overlapping */}
            <div className="flex items-center">
              {visibleItems.map((item, i) => (
                <MiniPlate key={`${item.id}-${i}`} item={item} index={i} />
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
          </>
        )}
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
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2.5 space-y-3">
          {cartItems.map((item, index) => {
            const hasCustomizations =
              (item.fixedContornos ?? []).length > 0 ||
              (item.contornoSubstitutions ?? []).length > 0 ||
              (item.removedComponents ?? []).length > 0 ||
              (item.selectedAdicionales ?? []).length > 0 ||
              (item.selectedBebidas ?? []).length > 0 ||
              !!item.includedNote;

            return (
              <div
                key={`${item.id}-${index}`}
                className="flex items-start gap-3.5 p-4 rounded-[16px] bg-bg-card border border-border/80 shadow-sm"
              >
                {/* Plate image 48×48 */}
                <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-section border border-border/40 flex items-center justify-center text-[22px] shrink-0">
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
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-display text-[16px] font-black text-text-main leading-tight break-words">
                      <span className="text-primary font-black mr-1">{item.quantity}×</span>
                      {item.name}
                    </p>
                    <div className="text-right shrink-0">
                      <p className="font-sans text-[13px] font-bold text-text-main tabular-nums leading-none">
                        {formatRef(computeItemUsdCents(item))}
                      </p>
                      <p className="font-sans text-[11px] text-text-muted/80 tabular-nums mt-1 leading-none">
                        ≈ {formatBs(item.itemTotalBsCents)}
                      </p>
                    </div>
                  </div>

                  {/* Customizations block */}
                  {hasCustomizations && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {item.includedNote && (
                        <span className="bg-emerald-50 text-[#15803d] border border-emerald-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="text-[#15803d] font-extrabold">✓</span>
                          {item.includedNote}
                        </span>
                      )}

                      {(item.fixedContornos ?? []).map((c, i) => (
                        <span key={`${c.id}-${i}`} className="bg-surface-section text-text-muted border border-border/50 px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center">
                          {c.name}
                        </span>
                      ))}

                      {(item.contornoSubstitutions ?? []).map((s, idx) => (
                        <span key={idx} className="bg-[#fff2e2]/70 text-text-main border border-[#ffb259]/20 px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1">
                          <span className="text-[#b8893a]">🔀</span>
                          <span>{s.substituteName}</span>
                          <span className="text-[9px] text-text-muted font-normal italic">por {s.originalName}</span>
                          {s.priceUsdCents > 0 && (
                            <span className="text-[9px] font-bold text-primary">+{formatRef(s.priceUsdCents)}</span>
                          )}
                        </span>
                      ))}

                      {(item.removedComponents ?? []).map((r) => (
                        <span key={r.componentId} className="bg-[#fff0f0]/80 text-[#c0392b] border border-[rgba(192,57,43,0.12)] px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 opacity-75 line-through">
                          Sin {r.name}
                        </span>
                      ))}

                      {(item.selectedAdicionales ?? []).map((a) => (
                        <span key={a.id} className="bg-[rgba(22,163,74,0.06)] text-[#15803d] border border-[rgba(22,163,74,0.14)] px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <span>+{a.quantity ?? 1}×</span>
                          <span>{a.name}</span>
                          {a.priceUsdCents > 0 && (
                            <span className="text-[9px] font-bold text-[#15803d]/85">+{formatRef(a.priceUsdCents * (a.quantity ?? 1))}</span>
                          )}
                        </span>
                      ))}

                      {(item.selectedBebidas ?? []).map((b) => (
                        <span key={b.id} className="bg-[rgba(37,26,7,0.04)] text-text-main border border-[rgba(37,26,7,0.06)] px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <span>+{b.quantity ?? 1}×</span>
                          <span>{b.name}</span>
                          {b.priceUsdCents > 0 && (
                            <span className="text-[9px] font-bold text-text-muted">+{formatRef(b.priceUsdCents * (b.quantity ?? 1))}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Totals block */}
          {(() => {
            const derivedRate = grandTotalUsdCents > 0 ? grandTotalBsCents / grandTotalUsdCents : 0;
            return (
              <div className="mt-4 px-1 space-y-0.5 bg-surface-section/50 rounded-[16px] p-4 border border-border/30">
                <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
                  <span>Subtotal</span>
                  <div className="text-right font-semibold text-text-main tabular-nums">
                    <span>{formatRef(grandTotalUsdCents - surcharges.totalSurchargeUsdCents)}</span>
                    <span className="text-[11px] text-text-muted/65 font-medium ml-1.5">
                      ≈ {formatBs(grandTotalBsCents - Math.round(surcharges.totalSurchargeUsdCents * derivedRate))}
                    </span>
                  </div>
                </div>

                {surcharges.deliveryUsdCents > 0 && (
                  <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
                    <span>Delivery</span>
                    <div className="text-right font-semibold text-text-main tabular-nums">
                      <span>+{formatRef(surcharges.deliveryUsdCents)}</span>
                      <span className="text-[11px] text-text-muted/65 font-medium ml-1.5">
                        ≈ {formatBs(Math.round(surcharges.deliveryUsdCents * derivedRate))}
                      </span>
                    </div>
                  </div>
                )}

                {surcharges.packagingUsdCents > 0 && (
                  <div className="flex justify-between py-1.5 text-[13px] text-text-muted">
                    <span>Envases</span>
                    <div className="text-right font-semibold text-text-main tabular-nums">
                      <span>+{formatRef(surcharges.packagingUsdCents)}</span>
                      <span className="text-[11px] text-text-muted/65 font-medium ml-1.5">
                        ≈ {formatBs(Math.round(surcharges.packagingUsdCents * derivedRate))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-border/60 my-2.5" />

                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-sans text-[13px] font-bold text-text-main uppercase tracking-widest">
                    Total
                  </span>
                  <div className="text-right">
                    <p className="font-sans text-[18px] font-black text-primary tabular-nums">
                      {formatRef(grandTotalUsdCents)}
                    </p>
                    <p className="font-sans text-[13px] text-text-muted font-bold tabular-nums mt-0.5">
                      ≈ {formatBs(grandTotalBsCents)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
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

