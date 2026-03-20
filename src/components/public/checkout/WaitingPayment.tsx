"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { Copy, Check, Clock } from "lucide-react";
import type { CartItem } from "@/store/cartStore";

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex h-9 w-9 items-center justify-center rounded-input transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-bg-image text-text-muted"
      }`}
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
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

    const poll = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();

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
        timeoutId = setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [orderId, onPaid]);

  return (
    <div className="px-4 pb-8">
      {/* Hero amount */}
      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">Transfiere</p>
        <p className="mt-2 text-[36px] font-extrabold text-primary">
          {formatBs(totalBsCents)}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
          <span className="text-xs text-text-muted">
            Esperando confirmación automática...
          </span>
        </div>
      </div>

      {/* Bank details */}
      <div className="mt-6 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Datos para Pago Móvil
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Banco</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.bankName} ({bankDetails.bankCode})
              </p>
            </div>
            <CopyButton value={`${bankDetails.bankName} (${bankDetails.bankCode})`} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Teléfono</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.accountPhone}
              </p>
            </div>
            <CopyButton value={bankDetails.accountPhone} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">RIF / Cédula</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.accountRif}
              </p>
            </div>
            <CopyButton value={bankDetails.accountRif} />
          </div>
        </div>
      </div>

      {/* Items summary */}
      <div className="mt-4 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold text-text-main">Resumen</p>
        {items.map((item, idx) => (
          <div key={idx} className="border-b border-border py-2 last:border-b-0">
            <p className="text-sm text-text-main">
              {item.quantity}× {item.name}
            </p>
            <p className="text-sm font-semibold text-price-green">
              {formatBs(item.itemTotalBsCents)}
            </p>
          </div>
        ))}
      </div>

      {/* Expiration countdown */}
      {secondsLeft > 0 && (
        <div className={`mt-4 flex items-center justify-center gap-1.5 text-sm ${
          secondsLeft < 300 ? "text-amber font-semibold" : "text-text-muted"
        }`}>
          <Clock size={14} />
          {secondsLeft < 300
            ? `¡Apresúrate! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : `Expira en ${Math.floor(secondsLeft / 60)} min`}
        </div>
      )}
    </div>
  );
}
