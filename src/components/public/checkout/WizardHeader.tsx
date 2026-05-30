"use client";

import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_LABELS: Record<number, string> = {
  1: "Modo de pedido",
  2: "Tus datos",
  3: "Método de pago",
  4: "Datos bancarios",
  5: "Confirmación",
};

interface WizardHeaderProps {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  onClose?: () => void;
  backDisabled?: boolean;
  hideBack?: boolean;
}

export function WizardHeader({
  step,
  totalSteps = 5,
  onBack,
  onClose,
  backDisabled,
  hideBack,
}: WizardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-bg-app border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Back button */}
        <div className="w-[38px] flex items-center">
          {!hideBack && (
            <button
              onClick={onBack}
              disabled={backDisabled}
              aria-label="Atrás"
              className={cn(
                "w-[38px] h-[38px] rounded-full border border-border flex items-center justify-center transition-colors",
                backDisabled
                  ? "opacity-30 cursor-not-allowed bg-bg-card"
                  : "bg-bg-card active:bg-surface-section cursor-pointer"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-text-main" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Center: step label */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted">
            Paso {step} de {totalSteps}
          </p>
          <p className="font-sans text-[13px] font-semibold text-text-main leading-none">
            {STEP_LABELS[step]}
          </p>
        </div>

        {/* Close button */}
        <div className="w-[38px] flex items-center justify-end">
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar checkout"
              className="w-[38px] h-[38px] rounded-full border border-border bg-bg-card flex items-center justify-center active:bg-surface-section transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-text-main" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
