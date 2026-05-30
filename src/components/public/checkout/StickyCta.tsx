"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBs, formatRef } from "@/lib/money";

interface StickyCtaProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  grandTotalUsdCents?: number;
  grandTotalBsCents?: number;
  showTotal?: boolean;
}

export function StickyCta({
  label,
  onClick,
  disabled,
  loading,
  loadingLabel = "Procesando...",
  grandTotalUsdCents,
  grandTotalBsCents,
  showTotal = true,
}: StickyCtaProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 px-5 pb-6 pt-3.5 bg-bg-app/95 backdrop-blur-xl border-t border-border">
      {showTotal && grandTotalUsdCents !== undefined && grandTotalBsCents !== undefined && (
        <div className="flex items-baseline justify-between mb-3 px-1">
          <span className="font-sans text-[10px] uppercase tracking-widest text-text-muted">
            Total
          </span>
          <div className="text-right">
            <span className="font-display text-2xl font-bold text-text-main tabular-nums">
              {formatRef(grandTotalUsdCents)}
            </span>
            <span className="font-sans text-xs text-text-muted tabular-nums ml-2">
              ≈ {formatBs(grandTotalBsCents)}
            </span>
          </div>
        </div>
      )}
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "w-full h-14 rounded-full font-semibold text-base shadow-elevated transition-all active:scale-[0.98]",
          disabled || loading
            ? "bg-surface-section text-text-muted cursor-not-allowed"
            : "bg-primary text-white"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingLabel}
          </span>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
