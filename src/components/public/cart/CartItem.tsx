"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { type CartItem as CartItemType } from "@/store/cartStore";

interface CartItemProps {
  item: CartItemType;
  index: number;
  onUpdateQuantity: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
}

function computeItemUsdCents(item: CartItemType): number {
  const fixedContornosUsd = (item.fixedContornos ?? []).reduce((sum, c) => sum + c.priceUsdCents, 0);
  const substitutionsUsd = (item.contornoSubstitutions ?? []).reduce((sum, s) => sum + s.priceUsdCents, 0);
  const adicionalesUsd = (item.selectedAdicionales ?? []).reduce((sum, a) => sum + a.priceUsdCents * (a.quantity ?? 1), 0);
  const bebidasUsd = (item.selectedBebidas ?? []).reduce((sum, b) => sum + b.priceUsdCents * (b.quantity ?? 1), 0);
  const removalsUsd = (item.removedComponents ?? []).reduce((sum, r) => sum + r.priceUsdCents, 0);
  return item.baseUsdCents + fixedContornosUsd + substitutionsUsd + adicionalesUsd + bebidasUsd + removalsUsd;
}

export function CartItem({
  item,
  index,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const [pendingRemove, setPendingRemove] = useState(false);

  function handleDecrement() {
    if (item.quantity === 1) {
      setPendingRemove(true);
    } else {
      onUpdateQuantity(index, item.quantity - 1);
    }
  }

  const fixedContornos = item.fixedContornos ?? [];
  const substitutions = item.contornoSubstitutions ?? [];
  const adicionales = item.selectedAdicionales ?? [];
  const bebidas = item.selectedBebidas ?? [];
  const removals = item.removedComponents ?? [];

  const hasContornos = fixedContornos.length > 0 || substitutions.length > 0;
  const hasCustomizations =
    hasContornos || adicionales.length > 0 || bebidas.length > 0 || removals.length > 0;

  const lineUsdCents = computeItemUsdCents(item) * item.quantity;

  return (
    <>
      <div className="rounded-[10px] bg-bg-app border border-black/[0.06] overflow-hidden">
        {/* ── Header row: emoji · name/price · qty · delete ── */}
        <div className="flex items-center gap-2.5 px-2.5 pt-2.5 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-black/[0.06] text-lg">
            {item.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text-main leading-tight line-clamp-2">
              {item.quantity > 1 ? (
                <>
                  <span className="text-primary font-bold">{item.quantity}</span>{" "}
                  servicios de {item.name}
                </>
              ) : (
                item.name
              )}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {formatBs(item.baseBsCents)} / unidad
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white rounded-full border border-black/[0.09] overflow-hidden">
              <button
                onClick={handleDecrement}
                className="flex h-7 w-7 items-center justify-center text-primary text-base font-semibold transition-colors hover:bg-primary/5"
                aria-label="Reducir cantidad"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[22px] text-center text-[13px] font-semibold text-text-main">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center text-primary text-base font-semibold transition-colors hover:bg-primary/5"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.06] bg-white text-text-muted transition-colors hover:text-error hover:border-error/30"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ── Customizations: pills ── */}
        {hasCustomizations && (
          <div className="px-2.5 pb-2.5 flex flex-col gap-1">
            {/* Contornos */}
            {hasContornos && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted w-[62px] shrink-0">
                  Contornos
                </span>
                <div className="flex flex-wrap gap-1">
                  {fixedContornos.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white border border-black/[0.08] text-text-muted"
                    >
                      {c.name}
                    </span>
                  ))}
                  {substitutions.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.04] text-text-main"
                    >
                      <span className="line-through opacity-55 text-[10px]">{s.originalName}</span>
                      <span className="opacity-70 text-[10px]">→</span>
                      {s.substituteName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Removidos */}
            {removals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted w-[62px] shrink-0">
                  Sin
                </span>
                <div className="flex flex-wrap gap-1">
                  {removals.map((r) => (
                    <span
                      key={r.componentId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-error/10 text-error/80 italic"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extras / Adicionales */}
            {adicionales.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted w-[62px] shrink-0">
                  Extras
                </span>
                <div className="flex flex-wrap gap-1">
                  {adicionales.map((ad) => (
                    <span
                      key={ad.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.04] text-text-main"
                    >
                      {(ad.quantity ?? 1) > 1 ? `${ad.quantity}× ` : ""}{ad.name}
                      {ad.priceBsCents > 0 && (
                        <span className="text-[10px] opacity-70 font-normal">
                          {formatBs(ad.priceBsCents * (ad.quantity ?? 1))}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bebidas */}
            {bebidas.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted w-[62px] shrink-0">
                  Bebidas
                </span>
                <div className="flex flex-wrap gap-1">
                  {bebidas.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.06] text-text-main"
                    >
                      {(b.quantity ?? 1) > 1 ? `${b.quantity}× ` : ""}{b.name}
                      {b.priceBsCents > 0 && (
                        <span className="text-[10px] opacity-70 font-normal">
                          {formatBs(b.priceBsCents * (b.quantity ?? 1))}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Item footer: subtotal ── */}
        <div className="flex items-center justify-between px-2.5 py-[7px] border-t border-black/[0.06]">
          <span className="text-[11px] text-text-muted">
            Subtotal{item.quantity > 1 ? ` × ${item.quantity}` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted bg-white rounded px-1.5 py-0.5 border border-black/[0.06]">
              {formatRef(lineUsdCents)}
            </span>
            <span className="text-[13px] font-semibold text-text-main">
              {formatBs(item.itemTotalBsCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Remove confirmation dialog */}
      {pendingRemove && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: "rgba(28,20,16,0.5)" }}
          onClick={() => setPendingRemove(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-modal bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-[15px] font-semibold text-text-main">
              ¿Eliminar {item.name}?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onRemove(index);
                  setPendingRemove(false);
                }}
                className="flex h-[48px] items-center justify-center rounded-input bg-primary text-[15px] font-semibold text-white"
              >
                Eliminar
              </button>
              <button
                onClick={() => setPendingRemove(false)}
                className="flex h-[48px] items-center justify-center rounded-input border border-border text-[15px] font-semibold text-text-main"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
