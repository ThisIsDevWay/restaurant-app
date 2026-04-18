"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBs, formatRef } from "@/lib/money";
import { ClipboardCopy } from "lucide-react";
import type { CartItem } from "@/store/cartStore";
import { buildPagoMovilClipboard } from "@/lib/clipboard-pago-movil";
import { CopyAllButton } from "./CopyAllButton";
import { CopyButton } from "./CopyButton";

interface PaymentDetailsProps {
  orderId: string;
  exactAmountBsCents: number;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountPhone: string;
    accountRif: string;
  };
  expiresAt: Date;
  items: CartItem[];
  onPaid: () => void;
  onExpired: () => void;
}

function usePaymentPolling(
  orderId: string,
  onPaid: () => void,
  onExpired: () => void,
) {
  const [status, setStatus] = useState<string>("pending");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let active = true;
    let attempt = 0;
    const BASE_INTERVAL = 5000;
    const MAX_INTERVAL = 30000;

    const poll = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          attempt = 0;

          if (data.status === "paid") {
            onPaid();
            return;
          }
          if (data.status === "expired" || data.status === "failed") {
            onExpired();
            return;
          }
        }
      } catch {
        // ignore network errors, retry
      }

      if (active) {
        attempt++;
        const delay = Math.min(BASE_INTERVAL * Math.pow(2, attempt - 1), MAX_INTERVAL);
        timeoutId = setTimeout(poll, delay);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [orderId, onPaid, onExpired]);

  return { status };
}



export function PaymentDetails({
  orderId,
  exactAmountBsCents,
  bankDetails,
  expiresAt,
  items,
  onPaid,
  onExpired,
}: PaymentDetailsProps) {
  const { status } = usePaymentPolling(orderId, onPaid, onExpired);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeLeft(diff);
      if (diff <= 0) {
        onExpired();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft < 5 * 60 * 1000;

  return (
    <div className="px-4 pb-8">
      {/* Hero amount */}
      <div className="mt-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <p className="text-[13px] text-text-muted font-medium uppercase tracking-widest mb-2">Transfiere exactamente</p>
        <p className="text-[42px] font-display font-black text-text-main leading-tight">
          {formatBs(exactAmountBsCents)}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2.5 bg-success/5 py-2 px-4 rounded-full w-fit mx-auto border border-success/10">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[12px] font-bold text-success uppercase tracking-wider">
            Esperando pago...
          </span>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-bg-card p-5 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
        <p className="mb-4 text-[14px] font-display font-black text-text-main uppercase tracking-tight">
          Datos para Pago Móvil
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between group">
            <div>
              <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Banco</p>
              <p className="text-[15px] font-display font-bold text-text-main">
                {bankDetails.bankName} <span className="text-text-muted font-medium text-[13px]">({bankDetails.bankCode})</span>
              </p>
            </div>
            <CopyButton
              value={`${bankDetails.bankName} (${bankDetails.bankCode})`}
            />
          </div>

          <div className="flex items-center justify-between group">
            <div>
              <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Teléfono</p>
              <p className="text-[16px] font-display font-black text-text-main tracking-tight">
                {bankDetails.accountPhone}
              </p>
            </div>
            <CopyButton value={bankDetails.accountPhone} />
          </div>

          <div className="flex items-center justify-between group border-t border-border/50 pt-3">
            <div>
              <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider mb-0.5">RIF / Cédula</p>
              <p className="text-[15px] font-display font-bold text-text-main">
                {bankDetails.accountRif}
              </p>
            </div>
            <CopyButton value={bankDetails.accountRif} />
          </div>
        </div>

        {/* Copy all for Pago Móvil */}
        <div className="mt-5 border-t border-border pt-2">
          <CopyAllButton
            bankName={bankDetails.bankName}
            bankCode={bankDetails.bankCode}
            phone={bankDetails.accountPhone}
            rifOrCedula={bankDetails.accountRif}
            amountBsCents={exactAmountBsCents}
          />
        </div>
      </div>



      <div className="mt-4 rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <p className="mb-3 text-[14px] font-display font-black text-text-main uppercase tracking-tight">Resumen</p>
        {items.map((item, idx) => (
          <div key={idx} className="border-b border-border/50 py-3 last:border-b-0">
            <div className="flex justify-between items-start gap-3">
               <div className="flex-1">
                <p className="text-[14px] font-bold text-text-main leading-tight mb-1">
                  {item.quantity}× {item.name}
                </p>
                <p className="text-[14px] font-display font-black text-text-main whitespace-nowrap">
                  {formatBs(item.itemTotalBsCents)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1 bg-surface-section py-3 rounded-xl border border-border/50">
        <p
          className={`text-[13px] font-display font-black uppercase tracking-widest flex items-center gap-2 ${isUrgent ? "text-error" : "text-text-muted"} animate-in zoom-in duration-300`}
        >
          <span className="text-[16px]">⏱</span> Expira en {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
        {isUrgent && (
          <p className="text-[11px] font-bold text-error uppercase tracking-tighter animate-pulse">
            ¡Realiza el pago antes de que expire!
          </p>
        )}
      </div>
    </div>
  );
}
