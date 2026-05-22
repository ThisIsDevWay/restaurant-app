"use client";

import Image from "next/image";
import { formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SelectableItemRowProps {
  name: string;
  priceUsdCents: number;
  selected: boolean;
  onToggle: () => void;
  imageUrl?: string | null;
  /** Muestra miniatura (catálogo de platos). Adicionales/bebidas/contornos no la usan. */
  showImage?: boolean;
}

/**
 * Fila seleccionable reutilizable (checkbox + imagen opcional + nombre + precio).
 * Usada por el catálogo de platos y por el catálogo de los tabs simples.
 */
export function SelectableItemRow({
  name,
  priceUsdCents,
  selected,
  onToggle,
  imageUrl,
  showImage = false,
}: SelectableItemRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-white ring-primary"
          : "bg-bg-app ring-border hover:bg-white hover:ring-primary/40",
      )}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          selected ? "border-primary bg-primary" : "border-input bg-white",
        )}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {showImage &&
        (imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="size-9 shrink-0 rounded-lg border border-border bg-surface-section" />
        ))}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13px] font-semibold transition-colors",
            selected ? "text-primary" : "text-text-main",
          )}
        >
          {name}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-price-green">
          {formatRef(priceUsdCents)}
        </span>
      </span>
    </button>
  );
}
