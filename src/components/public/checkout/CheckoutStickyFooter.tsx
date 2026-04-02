"use client";

import { Loader2 } from "lucide-react";
import { formatBs } from "@/lib/money";

interface CheckoutStickyFooterProps {
  onSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  phoneValid: boolean;
  grandTotalBsCents: number;
}

export function CheckoutStickyFooter({
  onSubmit,
  isSubmitting,
  phoneValid,
  grandTotalBsCents,
}: CheckoutStickyFooterProps) {
  return (
    <div className="sticky bottom-0 bg-[#F8EFE6] border-t-[0.5px] border-black/10 px-4 pt-3 pb-6 mt-auto">
      <button
        onClick={() => onSubmit()}
        disabled={isSubmitting || !phoneValid}
        className="w-full h-[52px] bg-[#7B2D2D] hover:bg-[#6A2323] text-white rounded-[14px] font-medium flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando...
          </span>
        ) : (
          <>
            <span>Confirmar pedido</span>
            <span className="opacity-40">·</span>
            <span className="font-normal opacity-85 text-[14px]">{formatBs(grandTotalBsCents)}</span>
          </>
        )}
      </button>
    </div>
  );
}
