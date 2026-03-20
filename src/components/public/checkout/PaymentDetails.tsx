"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBs, formatRef } from "@/lib/money";
import { Copy, Check } from "lucide-react";
import type { CartItem } from "@/store/cartStore";

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
      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">Transfiere exactamente</p>
        <p className="mt-2 text-[36px] font-extrabold text-primary">
          {formatBs(exactAmountBsCents)}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
          <span className="text-xs text-text-muted">
            Esperando confirmación...
          </span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">
          Los céntimos identifican tu pedido de forma única
        </p>
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
            <CopyButton
              value={`${bankDetails.bankName} (${bankDetails.bankCode})`}
            />
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
            {item.selectedContorno && (
              <p className="text-xs text-text-muted">
                {item.selectedContorno.name}
              </p>
            )}
            {item.selectedAdicionales.length > 0 && (
              <p className="text-xs text-text-muted">
                + {item.selectedAdicionales.map((a) => a.name).join(", ")}
              </p>
            )}
            <p className="text-sm font-semibold text-price-green">
              {formatBs(item.itemTotalBsCents)}
            </p>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="mt-4 text-center">
        <p
          className={`text-sm font-semibold ${
            isUrgent ? "text-amber" : "text-text-muted"
          }`}
        >
          ⏱ Expira en {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
        {isUrgent && (
          <p className="text-xs font-semibold text-amber">¡Apresúrate!</p>
        )}
      </div>
    </div>
  );
}
