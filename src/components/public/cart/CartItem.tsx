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

  return (
    <>
      <div className="flex gap-3 border-b border-border py-3 last:border-b-0">
        {/* Emoji icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg-image text-2xl">
          {item.emoji}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-text-main leading-tight">
            {item.quantity > 1 ? `${item.quantity} servicios de ${item.name}` : item.name}
          </h4>

          <div className="mt-1.5 space-y-1.5">
            {/* Contornos */}
            {((item.fixedContornos ?? []).length > 0 || (item.contornoSubstitutions ?? []).length > 0) && (
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-text-main">Contornos</p>
                {(item.fixedContornos ?? []).map((c) => (
                  <p key={c.id} className="text-[11px] text-text-muted">
                    {c.name}
                  </p>
                ))}
                {(item.contornoSubstitutions ?? []).map((s, idx) => (
                  <p key={idx} className="text-[11px] text-text-muted">
                    {s.substituteName}
                    <span className="text-[10px] opacity-70 ml-1">
                      (en vez de {s.originalName})
                    </span>
                  </p>
                ))}
              </div>
            )}

            {/* Removidos */}
            {(item.removedComponents ?? []).length > 0 && (
              <div className="space-y-0.5">
                {(item.removedComponents ?? []).map((r) => (
                  <p key={r.componentId} className="text-[11px] text-error/70 italic">
                    Sin {r.name}
                  </p>
                ))}
              </div>
            )}

            {/* Adicionales */}
            {item.selectedAdicionales.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-text-main">Adicionales</p>
                {item.selectedAdicionales.map((adicional) => (
                  <p key={adicional.id} className="text-[11px] text-text-muted">
                    + {adicional.name}
                    {adicional.priceBsCents > 0 && (
                      <span className="ml-1 text-[10px] font-medium text-price-green">
                        ({formatBs(adicional.priceBsCents)} / {formatRef(adicional.priceUsdCents)})
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </div>

          <p className="mt-1.5 text-sm font-bold text-price-green">
            <span className="text-[10px] text-text-muted font-normal mr-1">Total:</span>
            {formatBs(item.itemTotalBsCents)}
          </p>
        </div>

        {/* Quantity controls */}
        <div className="flex flex-col items-end justify-between">
          <button
            onClick={() => onRemove(index)}
            className="text-text-muted transition-colors hover:text-error"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrement}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-main"
              aria-label="Reducir cantidad"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center text-sm font-semibold">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(index, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-3 w-3" />
            </button>
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
