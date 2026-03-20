"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatBs } from "@/lib/money";
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
          <h4 className="text-sm font-semibold text-text-main">{item.name}</h4>

          {item.selectedContorno && (
            <p className="text-xs text-text-muted">
              Contorno: {item.selectedContorno.name}
            </p>
          )}

          {item.selectedAdicionales.length > 0 && (
            <p className="text-xs text-text-muted">
              + {item.selectedAdicionales.map((a) => a.name).join(", ")}
            </p>
          )}

          <p className="mt-1 text-sm font-semibold text-price-green">
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
