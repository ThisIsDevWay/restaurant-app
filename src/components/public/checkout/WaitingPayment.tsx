"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { Copy, Check, Clock, ClipboardCopy } from "lucide-react";
import type { CartItem } from "@/store/cartStore";
import { buildPagoMovilClipboard } from "@/lib/clipboard-pago-movil";
import { CopyAllButton } from "./CopyAllButton";
import { CopyButton } from "./CopyButton";

interface WaitingPaymentProps {
  orderId: string;
  expiresAt: string;
  totalBsCents: number;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountPhone: string;
    accountRif: string;
  };
  items: CartItem[];
  onPaid: () => void;
}



export function WaitingPayment({
  orderId,
  expiresAt,
  totalBsCents,
  bankDetails,
  items,
  onPaid,
}: WaitingPaymentProps) {
  const router = useRouter();

  // Countdown
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000,
      );
      setSecondsLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (secondsLeft === 0) router.push("/checkout/expired");
  }, [secondsLeft, router]);

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;
    let attempt = 0;
    const BASE_INTERVAL = 5000;
    const MAX_INTERVAL = 30000;

    const poll = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          attempt = 0;

          if (data.status === "paid") {
            onPaid();
            return;
          }
          if (data.status === "expired" || data.status === "failed") {
            return;
          }
        }
      } catch {
        // ignore
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
  }, [orderId, onPaid]);

  return (
    <div className="px-4 pb-8 bg-bg-app min-h-screen">
      {/* Hero amount */}
      <div className="pt-8 pb-6 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <p className="text-[11px] font-display font-bold tracking-[0.1em] text-text-muted uppercase mb-1">Total a transferir</p>
        <p className="text-[42px] font-display font-black text-primary leading-tight">
          {formatBs(totalBsCents)}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2.5 bg-success/5 border border-success/10 py-2.5 px-4 rounded-full mx-auto w-fit">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-[11px] font-bold text-success/80 uppercase tracking-wider">
            Esperando confirmación automática...
          </span>
        </div>
      </div>

      {/* Bank details */}
      <div className="mt-2 rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">
          💳 Datos para Pago Móvil
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
            <div>
              <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Banco</p>
              <p className="text-[14px] font-bold text-text-main">
                {bankDetails.bankName} <span className="text-text-muted/70 font-medium">({bankDetails.bankCode})</span>
              </p>
            </div>
            <CopyButton value={`${bankDetails.bankName} (${bankDetails.bankCode})`} />
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
            <div>
              <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Teléfono</p>
              <p className="text-[14px] font-bold text-text-main tracking-wide">
                {bankDetails.accountPhone}
              </p>
            </div>
            <CopyButton value={bankDetails.accountPhone} />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">RIF / Cédula</p>
              <p className="text-[14px] font-bold text-text-main tracking-wide">
                {bankDetails.accountRif}
              </p>
            </div>
            <CopyButton value={bankDetails.accountRif} />
          </div>
        </div>
      </div>

      {/* Copy all for Pago Móvil */}
      <CopyAllButton
        bankName={bankDetails.bankName}
        bankCode={bankDetails.bankCode}
        phone={bankDetails.accountPhone}
        rifOrCedula={bankDetails.accountRif}
        amountBsCents={totalBsCents}
      />
      <div className="mt-4 rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">📦 Tu pedido</p>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
              <span className="text-[14px] font-medium text-text-main">
                {item.quantity}× {item.name}
              </span>
              <span className="text-[14px] font-bold text-primary">
                {formatBs(item.itemTotalBsCents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expiration countdown */}
      {secondsLeft > 0 && (
        <div className={`mt-8 flex items-center justify-center gap-2 text-[13px] py-3 px-4 rounded-xl border ${
          secondsLeft < 300 
            ? "bg-warning/5 border-warning/20 text-warning font-bold animate-pulse" 
            : "bg-surface-section border-border text-text-muted font-medium"
          }`}>
          <Clock size={16} />
          {secondsLeft < 300
            ? `¡Tu orden expira pronto! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : `Esta orden expira en ${Math.floor(secondsLeft / 60)} minutos`}
        </div>
      )}
    </div>
  );
}
