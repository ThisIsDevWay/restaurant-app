"use client";

import { useEffect, useState } from "react";
import { formatBs } from "@/lib/money";
import type { CartItem } from "@/store/cartStore";
import { ExternalLink } from "lucide-react";

interface WhatsAppPaymentProps {
  orderId: string;
  waLink: string;
  prefilledMessage: string;
  items: CartItem[];
  totalBsCents: number;
  onPaid: () => void;
}

export function WhatsAppPayment({
  orderId,
  waLink,
  prefilledMessage,
  items,
  totalBsCents,
  onPaid,
}: WhatsAppPaymentProps) {
  const [status, setStatus] = useState("whatsapp");

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;
    let attempt = 0;
    const BASE_INTERVAL = 8000;
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
    <div className="px-4 pb-8">
      {/* WhatsApp CTA */}
      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">Envía tu pedido por</p>
        <p className="mt-2 text-2xl font-extrabold text-primary">WhatsApp</p>
      </div>

      <div className="mt-6 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm text-text-muted">
          Toca el botón para abrir WhatsApp con tu pedido pre-formateado.
          El restaurante recibirá tu mensaje y coordinará el pago contigo.
        </p>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-input bg-green-600 py-4 text-base font-bold text-white"
        >
          <ExternalLink className="h-5 w-5" />
          Abrir WhatsApp
        </a>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
          <span className="text-xs text-text-muted">
            Esperando confirmación del restaurante...
          </span>
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
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm font-bold text-price-green">
            Total {formatBs(totalBsCents)}
          </p>
        </div>
      </div>
    </div>
  );
}
