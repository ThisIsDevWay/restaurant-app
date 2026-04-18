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
    <div className="px-4 pb-8 bg-bg-app min-h-screen">
      {/* WhatsApp CTA */}
      <div className="pt-8 pb-4 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <p className="text-[11px] font-display font-bold tracking-[0.1em] text-text-muted uppercase mb-1">Finaliza tu pedido vía</p>
        <p className="text-[32px] font-display font-black text-primary leading-tight">WhatsApp</p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <p className="mb-6 text-[14px] text-text-muted leading-relaxed text-center">
          Toca el botón para enviar tu pedido. 
          El restaurante recibirá tu mensaje y <b>coordinará el pago</b> contigo directamente.
        </p>

        <a
          href={`whatsapp://send?phone=${waLink.split("/").pop()?.split("?")[0]}&text=${encodeURIComponent(prefilledMessage)}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 text-base font-display font-bold text-white shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
        >
          <ExternalLink className="h-5 w-5" />
          Abrir WhatsApp
        </a>

        {/* Fallback: web WhatsApp */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-text-muted">
            ¿No se abre automáticamente? Prueba{" "}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary underline underline-offset-2"
            >
              WhatsApp Web
            </a>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2.5 bg-surface-section py-2 px-4 rounded-full w-fit mx-auto border border-border/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Esperando confirmación...
          </span>
        </div>
      </div>

      {/* Items summary */}
      <div className="mt-4 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">📦 Resumen del pedido</p>
        <div className="space-y-1 mb-4">
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
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] font-display font-bold text-text-main uppercase tracking-wider">Total</span>
            <div className="text-[20px] font-display font-black text-primary">
              {formatBs(totalBsCents)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
