"use client";

import Image from "next/image";
import { formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface SelectableItemRowProps {
  name: string;
  priceUsdCents: number;
  selected: boolean;
  onToggle: () => void;
  imageUrl?: string | null;
  /** Muestra miniatura (catálogo de platos). Adicionales/bebidas/contornos no la usan. */
  showImage?: boolean;
  alwaysShowIfAssigned?: boolean;
  onAlwaysShowToggle?: (val: boolean) => void;
  isHighRisk?: boolean;
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
  alwaysShowIfAssigned = false,
  onAlwaysShowToggle,
  isHighRisk = false,
}: SelectableItemRowProps) {
  if (!onAlwaysShowToggle) {
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
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "block truncate text-[13px] font-semibold transition-colors",
                selected ? "text-primary" : "text-text-main",
              )}
            >
              {name}
            </span>
            {isHighRisk && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold text-amber-600 ring-1 ring-amber-500/20 shrink-0">
                ⚠️ Riesgo
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold text-price-green">
            {formatRef(priceUsdCents)}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".switch-container")) {
          return;
        }
        onToggle();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-all outline-none cursor-pointer",
        selected
          ? "bg-white ring-primary"
          : "bg-bg-app ring-border hover:bg-white hover:ring-primary/40",
      )}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
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

      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "block truncate text-[13px] font-semibold transition-colors",
              selected ? "text-primary" : "text-text-main",
            )}
          >
            {name}
          </span>
          {isHighRisk && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold text-amber-600 ring-1 ring-amber-500/20 shrink-0">
              ⚠️ Riesgo
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-price-green">
          {formatRef(priceUsdCents)}
        </span>
      </div>

      <div className="switch-container flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/60">
        <span className="text-[10px] font-semibold text-text-muted select-none">
          Mostrar siempre
        </span>
        <Switch
          size="sm"
          checked={alwaysShowIfAssigned}
          onCheckedChange={onAlwaysShowToggle}
        />
      </div>
    </div>
  );
}

