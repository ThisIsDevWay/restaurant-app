"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, UtensilsCrossed, XCircle, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentInitResult } from "@/lib/payment-providers/types";
import type { OrderMode } from "./CheckoutForm.types";
import { supabaseBrowser } from "@/lib/supabase-client";

type Phase = "waiting" | "verified" | "preparing" | "done";

interface Step5SuccessProps {
  orderId: string;
  initResult: PaymentInitResult;
  orderMode: OrderMode | null;
  paymentMethod?: string | null;
  onNewOrder: () => void;
  onPaid?: () => void;
}

const PHASE_DELAYS: Record<Phase, number> = {
  waiting: 0,
  verified: 2200,
  preparing: 4400,
  done: 6000,
};

const ORDER_TRACKER = (mode: OrderMode | null, isEfectivo: boolean) => [
  { label: "Pedido registrado", desc: "Recibimos tu solicitud" },
  isEfectivo
    ? { label: "Pago contra entrega", desc: "Pagas al recibir tu pedido" }
    : { label: "Verificando pago", desc: "En breve confirmaremos tu pago" },
  { label: "En cocina", desc: "Preparando tu comida" },
  {
    label: mode === "delivery" ? "En camino" : mode === "take_away" ? "Listo para retirar" : "Servido",
    desc: mode === "delivery" ? "El repartidor está en camino" : mode === "take_away" ? "Puedes pasar a retirarlo" : "Tu pedido llega a tu mesa",
  },
];

export function Step5Success({
  orderId,
  initResult,
  orderMode,
  paymentMethod,
  onNewOrder,
  onPaid,
}: Step5SuccessProps) {
  const isEfectivo = paymentMethod === "efectivo";
  const [dbStatus, setDbStatus] = useState<string>(
    isEfectivo ? "paid" : (initResult.screen === "whatsapp" ? "whatsapp" : "pending")
  );
  const [clickedWa, setClickedWa] = useState(false);
  const shortId = orderId.slice(-6).toUpperCase();
  const screen = initResult.screen;

  // Fetch initial status and subscribe to Realtime updates (no polling)
  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.status) {
            setDbStatus(data.status);
            if (data.status === "paid" && onPaid) {
              onPaid();
            }
          }
        }
      } catch { }
    };
    fetchStatus();

    const channel = supabaseBrowser
      .channel(`order-tracker-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new && payload.new.status && active) {
            setDbStatus(payload.new.status);
            if (payload.new.status === "paid" && onPaid) {
              onPaid();
            }
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabaseBrowser.removeChannel(channel);
    };
  }, [orderId, onPaid]);

  const cleanWaLink = screen === "whatsapp" ? initResult.waLink : null;
  const trackerItems = ORDER_TRACKER(orderMode, isEfectivo);

  return (
    <div className="flex flex-col items-center gap-6 pb-10">
      {/* Hero icon with phase color */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
            (dbStatus === "whatsapp" || dbStatus === "pending")
              ? "bg-[rgba(184,137,58,0.12)]"
              : (dbStatus === "cancelled" || dbStatus === "expired")
                ? "bg-primary/10"
                : "bg-[#E8EFE3]"
          )}
        >
          {(dbStatus === "whatsapp" || dbStatus === "pending") ? (
            <div className="w-10 h-10 rounded-full border-4 border-[#B8893A]/40 border-t-[#B8893A] animate-spin" />
          ) : (dbStatus === "cancelled" || dbStatus === "expired") ? (
            <XCircle className="w-12 h-12 text-primary" strokeWidth={1.5} />
          ) : (
            <CheckCircle2
              className="w-12 h-12 text-[#3F6B4A]"
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="text-center">
          <p className="font-display text-[32px] font-bold text-text-main leading-tight tracking-[-0.02em]">
            {dbStatus === "whatsapp" || dbStatus === "pending"
              ? "¡Pedido recibido!"
              : dbStatus === "paid"
                ? (isEfectivo ? "¡Pedido confirmado!" : "¡Pago verificado!")
                : dbStatus === "kitchen"
                  ? "¡En preparación!"
                  : dbStatus === "delivered"
                    ? (orderMode === "delivery" ? "¡En camino!" : orderMode === "take_away" ? "¡Listo para retirar!" : "¡Servido!")
                    : (dbStatus === "cancelled" ? "Pedido cancelado" : "Pedido expirado")}
          </p>
          <p className="font-sans text-[14px] text-text-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
            {dbStatus === "whatsapp" || dbStatus === "pending"
              ? (initResult.screen === "whatsapp"
                ? "Hemos registrado tu pedido en nuestro sistema. En breve nos comunicaremos contigo por WhatsApp para coordinar el pago y la entrega."
                : "Esperando confirmación automática del pago")
              : dbStatus === "paid"
                ? (isEfectivo ? "Tu pedido ha sido recibido y se pagará en efectivo al recibir." : "Tu pago ha sido confirmado exitosamente")
                : dbStatus === "kitchen"
                  ? "Tu pedido ya está siendo preparado en cocina"
                  : dbStatus === "delivered"
                    ? (orderMode === "delivery"
                      ? "El repartidor va en camino a tu dirección"
                      : orderMode === "take_away"
                        ? "Puedes pasar a retirar tu pedido por el local"
                        : "Tu comida ha sido servida en tu mesa")
                    : (dbStatus === "cancelled"
                      ? "Tu pedido fue cancelado por el restaurante"
                      : "El tiempo límite para realizar el pago ha expirado")}
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

      {/* Progress tracker (hidden for cancelled/expired orders) */}
      {dbStatus !== "cancelled" && dbStatus !== "expired" && (
        <div className="w-full flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {trackerItems.map((item, i) => {
            let isDone = false;
            let isActive = false;

            if (dbStatus === "whatsapp" || dbStatus === "pending") {
              if (i === 0) isDone = true;
              if (i === 1) isActive = true;
            } else if (dbStatus === "paid") {
              if (i <= 1) isDone = true;
              if (i === 2) isActive = true;
            } else if (dbStatus === "kitchen") {
              if (i <= 2) isDone = true;
              if (i === 3) isActive = true;
            } else if (dbStatus === "delivered") {
              isDone = true;
            }

            const isLast = i === trackerItems.length - 1;
            return (
              <div key={i} className="flex items-start gap-3">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-500",
                      isDone || isActive ? "bg-[#3F6B4A] border-[#3F6B4A]" : "bg-surface-section border-border"
                    )}
                  >
                    {isDone && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-8 transition-colors duration-500",
                        isDone ? "bg-[#3F6B4A]" : "bg-surface-section"
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
        <button
          onClick={onNewOrder}
          className="w-full h-14 bg-primary text-white rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] hover:bg-primary/95 shadow-elevated active:scale-[0.98] transition-all"
        >
          Volver al menú (Seguir en vivo)
          <ArrowRight className="w-5 h-5" />
        </button>

        {cleanWaLink && (dbStatus === "whatsapp" || dbStatus === "pending") && (
          <a
            href={cleanWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-14 bg-bg-card border border-border text-[#25D366] hover:bg-[#25D366]/5 rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] active:scale-[0.98] transition-all"
          >
            <ExternalLink className="w-5 h-5 text-[#25D366]" />
            Escribir al WhatsApp de la tienda
          </a>
        )}
      </div>
    </div>
  );
}
