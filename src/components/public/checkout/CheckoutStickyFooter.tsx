"use client";

import { Loader2, User, ChevronRight, AlertCircle } from "lucide-react";
import { formatBs } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CheckoutStickyFooterProps {
  onSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  phoneValid: boolean;
  grandTotalBsCents: number;
  orderModeSelected: boolean;
  isReturning: boolean;
  name: string;
}

export function CheckoutStickyFooter({
  onSubmit,
  isSubmitting,
  phoneValid,
  grandTotalBsCents,
  orderModeSelected,
  isReturning,
  name,
}: CheckoutStickyFooterProps) {
  const canSubmit = phoneValid && orderModeSelected;
  
  // Get initials for avatar
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getStatusMessage = () => {
    if (!orderModeSelected) return "Selecciona retiro o delivery";
    if (!phoneValid) return "Ingresa tu número celular";
    return "¡Todo listo!";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glassmorphic backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-[#7B2D2D]/10" />
      
      <div className="relative max-w-md mx-auto px-5 pt-4 pb-8 flex items-center justify-between gap-4">
        {/* User Info / Avatar */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-display font-black shadow-sm flex-shrink-0",
            isReturning ? "bg-[#2A7A4A] text-white" : "bg-border/40 text-text-muted"
          )}>
            {isReturning && initials ? initials : <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[clamp(9px,2.5vw,10px)] font-display font-black text-text-muted uppercase tracking-widest truncate">
              {isReturning ? `Hola, ${name.split(' ')[0]}` : "Finalizar como"}
            </p>
            <p className="text-[clamp(11px,3vw,12px)] font-bold text-text-main truncate">
              {isReturning ? "Cliente recurrente" : "Invitado"}
            </p>
          </div>
        </div>

        {/* CTA Button Wrapper */}
        <div className="flex flex-col items-end gap-1.5 flex-1 max-w-[200px]">
          {!canSubmit && (
            <div className="flex items-center gap-1 text-[clamp(9px,2.5vw,10px)] font-black text-[#7B2D2D] uppercase tracking-tight animate-in fade-in slide-in-from-bottom-1 whitespace-nowrap overflow-hidden">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getStatusMessage()}</span>
            </div>
          )}
          
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-black text-[14px] flex items-center justify-center gap-2 transition-all duration-300 shadow-lg active:scale-95",
              canSubmit && !isSubmitting
                ? "bg-[#7B2D2D] text-white shadow-[#7B2D2D]/30 hover:bg-[#5a2121]"
                : "bg-border/40 text-text-muted cursor-not-allowed shadow-none"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-1 min-w-0 px-2">
                <span className="truncate text-[clamp(13px,4vw,15px)]">Pagar {formatBs(grandTotalBsCents)}</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
