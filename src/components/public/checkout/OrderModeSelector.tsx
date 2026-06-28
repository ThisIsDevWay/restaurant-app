"use client";

import { Store, Package, MapPin, AlertCircle } from "lucide-react";
import { formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderMode } from "./CheckoutForm.types";

interface OrderModeOption {
  id: OrderMode;
  label: string;
  icon: typeof Store;
  enabled: boolean;
  description: string;
}

interface OrderModeSelectorProps {
  availableModes: OrderModeOption[];
  orderMode: OrderMode | null;
  onSetOrderMode: (mode: OrderMode) => void;
  settings: { deliveryCoverage: string | null; deliveryFeeUsdCents?: number } | null;
  isSubmitting: boolean;
  surcharges: { deliveryUsdCents: number };
}

const MODE_ICONS: Record<string, typeof Store> = {
  on_site: Store,
  take_away: Package,
  delivery: MapPin,
};

const MODE_LABELS: Record<string, string> = {
  on_site: "En sitio",
  take_away: "Para llevar",
  delivery: "Delivery",
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  on_site: "Para comer en el local",
  take_away: "Retiro en local",
  delivery: "A domicilio",
};

export function OrderModeSelector({
  availableModes,
  orderMode,
  onSetOrderMode,
  settings,
  isSubmitting,
  surcharges,
}: OrderModeSelectorProps) {

  return (
    <div className="flex flex-col gap-2.5">
      {availableModes.map((mode) => {
        const Icon = MODE_ICONS[mode.id];
        const selected = orderMode === mode.id;
        const isDelivery = mode.id === "delivery";
        return (
          <div key={mode.id}>
            <button
              type="button"
              onClick={() => onSetOrderMode(mode.id)}
              disabled={isSubmitting}
              className={cn(
                "w-full flex items-center gap-3.5 p-4 rounded-[18px] border transition-all duration-200 text-left",
                selected
                  ? "bg-bg-card border-2 border-primary shadow-[0_8px_22px_rgba(187,0,5,0.12)]"
                  : "bg-bg-card border border-border shadow-card"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 transition-colors duration-200",
                  selected ? "bg-primary text-white" : "bg-surface-section text-text-main"
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={selected ? 2.5 : 2} />
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-[22px] leading-none text-text-main">
                  {MODE_LABELS[mode.id]}
                </p>
                <p className="font-sans text-[13px] text-text-muted mt-0.5">
                  {MODE_DESCRIPTIONS[mode.id]}
                </p>
                {isDelivery && surcharges.deliveryUsdCents > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-section text-text-muted font-sans text-[10px] font-semibold">
                    +{formatRef(surcharges.deliveryUsdCents)}
                  </span>
                )}
              </div>

              {/* Radio */}
              <div
                className={cn(
                  "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200",
                  selected ? "bg-primary border-primary" : "border-border"
                )}
              >
                {selected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Delivery address — only shown under delivery card */}
            {isDelivery && orderMode === "delivery" && settings?.deliveryCoverage && (
              <div className="mt-2 px-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-amber-50/80 border border-amber-200/50 rounded-[12px] px-4 py-2.5 flex items-start gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-tight font-bold text-amber-900/70 uppercase tracking-wider">
                    {settings.deliveryCoverage}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
