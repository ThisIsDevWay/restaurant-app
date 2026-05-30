"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentInitResult } from "@/lib/payment-providers/types";
import type { OrderMode } from "./CheckoutForm.types";

type Phase = "waiting" | "verified" | "preparing" | "done";

interface Step5SuccessProps {
  orderId: string;
  initResult: PaymentInitResult;
  orderMode: OrderMode | null;
  onNewOrder: () => void;
  onPaid?: () => void;
}

const PHASE_DELAYS: Record<Phase, number> = {
  waiting: 0,
  verified: 2200,
  preparing: 4400,
  done: 6000,
};

const ORDER_TRACKER = (mode: OrderMode | null) => [
  { label: "Pago recibido", desc: "Tu pago fue confirmado" },
  { label: "En cocina", desc: "Tu pedido está siendo preparado" },
  {
    label: mode === "delivery" ? "En camino" : mode === "take_away" ? "Listo para retirar" : "Sirviendo",
    desc: mode === "delivery" ? "El repartidor está en camino" : mode === "take_away" ? "Pasa a buscar tu pedido" : "Tu pedido llega a tu mesa",
  },
];

export function Step5Success({
  orderId,
  initResult,
  orderMode,
  onNewOrder,
  onPaid,
}: Step5SuccessProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const shortId = orderId.slice(-6).toUpperCase();
  const screen = initResult.screen;

  // Phase animation progression
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase("verified"), PHASE_DELAYS.verified));
    timers.push(setTimeout(() => setPhase("preparing"), PHASE_DELAYS.preparing));
    timers.push(setTimeout(() => setPhase("done"), PHASE_DELAYS.done));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Real polling for waiting_auto and whatsapp screens
  useEffect(() => {
    if (screen !== "waiting_auto" && screen !== "whatsapp") return;
    if (!onPaid) return;

    let active = true;
    let timeoutId: NodeJS.Timeout;
    let attempt = 0;
    const BASE = screen === "whatsapp" ? 8000 : 5000;
    const MAX = 30000;

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
        }
      } catch {}
      if (active) {
        attempt++;
        timeoutId = setTimeout(poll, Math.min(BASE * Math.pow(2, attempt - 1), MAX));
      }
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [orderId, screen, onPaid]);

  const waLink = screen === "whatsapp" ? initResult.waLink : null;
  const trackerItems = ORDER_TRACKER(orderMode);

  return (
    <div className="flex flex-col items-center gap-6 pb-10">
      {/* Hero icon with phase color */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-700",
            phase === "waiting"
              ? "bg-[rgba(184,137,58,0.15)]"
              : "bg-primary/10"
          )}
        >
          {phase === "waiting" ? (
            <div className="w-10 h-10 rounded-full border-4 border-[#B8893A]/40 border-t-[#B8893A] animate-spin" />
          ) : (
            <CheckCircle2
              className={cn(
                "w-12 h-12 transition-colors duration-700",
                phase === "verified" ? "text-primary" : "text-primary"
              )}
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="text-center">
          <p className="font-display text-[34px] font-bold text-text-main leading-tight tracking-[-0.02em]">
            {phase === "waiting"
              ? "Verificando..."
              : phase === "verified"
              ? "¡Confirmado!"
              : "¡En preparación!"}
          </p>
          <p className="font-sans text-[14px] text-text-muted mt-1">
            {phase === "waiting"
              ? "Confirmando tu pago"
              : phase === "verified"
              ? "Pago recibido exitosamente"
              : "Tu pedido ya está en cocina"}
          </p>
        </div>

        {/* Order number */}
        <div className="px-5 py-2.5 bg-primary/5 rounded-full border border-primary/10 flex items-center gap-2">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-text-muted">
            Pedido
          </p>
          <p className="font-display text-[18px] font-bold text-primary tracking-wider">
            #{shortId}
          </p>
        </div>
      </div>

      {/* Progress tracker */}
      {phase !== "waiting" && (
        <div className="w-full flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {trackerItems.map((item, i) => {
            const isDone = phase === "done" ? i <= 1 : phase === "preparing" ? i === 0 : false;
            const isActive = phase === "preparing" && i === 1;
            const isLast = i === trackerItems.length - 1;
            return (
              <div key={i} className="flex items-start gap-3">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-500",
                      isDone || isActive ? "bg-primary border-primary" : "bg-surface-section border-border"
                    )}
                  >
                    {(isDone || isActive) && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-8 transition-colors duration-500",
                        isDone ? "bg-primary" : "bg-surface-section"
                      )}
                    />
                  )}
                </div>

                <div className="pb-4">
                  <p
                    className={cn(
                      "font-sans text-[14px] font-semibold transition-colors duration-500",
                      isDone || isActive ? "text-text-main" : "text-text-muted"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="font-sans text-[12px] text-text-muted">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full flex flex-col gap-3 mt-2">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] shadow-elevated active:scale-[0.98] transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            Hablar por WhatsApp
          </a>
        )}

        <button
          onClick={onNewOrder}
          className="w-full h-14 bg-bg-card border border-border text-text-main rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] active:bg-surface-section transition-all"
        >
          <UtensilsCrossed className="w-5 h-5" />
          Nuevo pedido
        </button>
      </div>
    </div>
  );
}
