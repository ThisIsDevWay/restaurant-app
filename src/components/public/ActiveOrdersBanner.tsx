"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase-client";

interface StoredOrder {
  id: string;
  totalBsCents: number;
  createdAt: number;
}

// Statuses where the banner is immediately cleaned up and hidden
const TERMINAL_STATUSES_IMMEDIATE = new Set(["cancelled", "expired"]);

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "text-[#B8893A] bg-[#B8893A]/5 border-[#B8893A]/20" },
  whatsapp: { label: "Verificando pago", color: "text-[#B8893A] bg-[#B8893A]/5 border-[#B8893A]/20" },
  paid: { label: "Pago verificado", color: "text-[#3F6B4A] bg-[#E8EFE3] border-[rgba(63,107,74,0.15)]" },
  kitchen: { label: "En cocina", color: "text-[#bb0005] bg-[#bb0005]/5 border-[#bb0005]/10" },
  delivered: { label: "Listo / Entregado", color: "text-[#3F6B4A] bg-[#E8EFE3] border-[rgba(63,107,74,0.2)]" },
};

/** Remove a single order from gm_orders in localStorage */
function removeOrderFromStorage(id: string) {
  try {
    const stored = localStorage.getItem("gm_orders");
    if (!stored) return;
    const orders: StoredOrder[] = JSON.parse(stored);
    const updated = orders.filter((o) => o.id !== id);
    localStorage.setItem("gm_orders", JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function ActiveOrdersBanner() {
  const [recentOrder, setRecentOrder] = useState<StoredOrder | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stored = localStorage.getItem("gm_orders");
        if (!stored) return;

        const orders: StoredOrder[] = JSON.parse(stored);
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const candidate = orders.find((o) => o.createdAt > twoHoursAgo);
        if (!candidate) return;

        // Check real status from the server
        const res = await fetch(`/api/orders/${candidate.id}/status`);
        if (cancelled) return;

        let fetchedStatus = "pending";
        let fetchedUpdatedAt: string | null = null;
        if (res.ok) {
          const { status: s, updatedAt: u } = (await res.json()) as { status: string; updatedAt?: string };
          fetchedStatus = s;
          fetchedUpdatedAt = u ?? null;
          if (TERMINAL_STATUSES_IMMEDIATE.has(fetchedStatus)) {
            // Order is done (cancelled/expired) — clean up localStorage and stay hidden
            removeOrderFromStorage(candidate.id);
            return;
          }
          if (fetchedStatus === "delivered" && fetchedUpdatedAt) {
            const deliveredTime = new Date(fetchedUpdatedAt).getTime();
            const fifteenMinutesAgo = Date.now() - 20 * 60 * 1000;
            if (deliveredTime < fifteenMinutesAgo) {
              removeOrderFromStorage(candidate.id);
              return;
            }
          }
        } else if (res.status === 404) {
          // Order doesn't exist anymore
          removeOrderFromStorage(candidate.id);
          return;
        }

        // Order is still active — show the banner
        if (!cancelled) {
          setStatus(fetchedStatus);
          setRecentOrder(candidate);
          if (fetchedStatus === "delivered" && fetchedUpdatedAt) {
            setDeliveredAt(new Date(fetchedUpdatedAt).getTime());
          }
        }
      } catch {
        // Network error: fall back to showing banner (fail-open)
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime updates for order status
  useEffect(() => {
    if (!recentOrder) return;

    const channel = supabaseBrowser
      .channel(`active-order-banner-${recentOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${recentOrder.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as { id: string; status: string; updated_at?: string };
          if (updatedOrder && updatedOrder.status) {
            if (TERMINAL_STATUSES_IMMEDIATE.has(updatedOrder.status)) {
              removeOrderFromStorage(recentOrder.id);
              setRecentOrder(null);
              setStatus(null);
              setDeliveredAt(null);
            } else {
              setStatus(updatedOrder.status);
              if (updatedOrder.status === "delivered") {
                const uTime = updatedOrder.updated_at ? new Date(updatedOrder.updated_at).getTime() : Date.now();
                setDeliveredAt(uTime);
              } else {
                setDeliveredAt(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [recentOrder]);

  // Expiration timer for delivered status (15 minutes limit)
  useEffect(() => {
    if (!deliveredAt || !recentOrder) {
      setTimeLeft("");
      return;
    }

    const updateTimeLeft = () => {
      const remainingMs = (deliveredAt + 15 * 60 * 1000) - Date.now();
      if (remainingMs <= 0) {
        removeOrderFromStorage(recentOrder.id);
        setRecentOrder(null);
        setStatus(null);
        setDeliveredAt(null);
        return;
      }
      const mins = Math.ceil(remainingMs / 60000);
      setTimeLeft(`(se ocultará en ${mins} min)`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 10000); // update every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [deliveredAt, recentOrder]);

  if (!recentOrder) return null;

  const shortId = recentOrder.id.slice(-6).toUpperCase();
  const minutesAgo = Math.max(0, Math.floor((Date.now() - recentOrder.createdAt) / 60000));

  const currentStatus = status ?? "pending";
  const styleInfo = STATUS_STYLES[currentStatus] ?? {
    label: currentStatus,
    color: "text-[#5f5e5e] bg-[#fff2e2] border-[#e7bdb7]/80",
  };

  const isDelivered = currentStatus === "delivered";

  const handleDismiss = () => {
    removeOrderFromStorage(recentOrder.id);
    setRecentOrder(null);
    setStatus(null);
  };

  return (
    <div className="px-5 mb-4 max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link
        href="/mis-pedidos"
        className={cn(
          "flex items-center gap-3.5 px-4.5 py-3.5 rounded-[18px] border transition-all active:scale-[0.99] shadow-sm relative group",
          isDelivered
            ? "bg-[#E8EFE3] hover:bg-[#D9ECD0] border-[#B8D7B5]"
            : "bg-[#FBEBE7] hover:bg-[#FFE0D9] border-[#f0c9c2]"
        )}
      >
        {/* Pulsating Indicator & Icon */}
        <div className={cn(
          "relative w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isDelivered ? "bg-[#3F6B4A]/10 text-[#3F6B4A]" : "bg-[#bb0005]/10 text-[#bb0005]"
        )}>
          {isDelivered ? <Check className="w-4.5 h-4.5" strokeWidth={3} /> : <Clock className="w-4 h-4" />}
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isDelivered ? "bg-[#3F6B4A]" : "bg-[#bb0005]"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isDelivered ? "bg-[#3F6B4A]" : "bg-[#bb0005]"
            )}></span>
          </span>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[8px] font-black uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[5px] border leading-none shrink-0",
              styleInfo.color
            )}>
              {styleInfo.label}
            </span>
            <span className="text-[10px] font-bold text-[#5f5e5e]/80 tracking-wider">
              PEDIDO #{shortId}
            </span>
          </div>

          <p className="text-[13px] font-display font-black text-[#251a07] leading-tight mt-0.5">
            {isDelivered ? "¡Tu pedido está listo! 🍽️" : "Tienes un pedido en curso"}
          </p>

          <p className="text-[11px] text-[#5f5e5e] mt-0.5 leading-snug">
            {isDelivered
              ? `Ya puedes pasar a buscarlo o recibirlo ${timeLeft}`
              : `Hace ${minutesAgo === 0 ? "unos instantes" : `${minutesAgo} min`}`}
          </p>
        </div>

        {/* Action Link & Dismiss */}
        <div className="flex items-center gap-3.5 shrink-0">
          <span className="text-[12px] font-bold text-[#bb0005] hover:underline shrink-0 leading-none">
            Seguir →
          </span>

          {/* Close/Dismiss Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDismiss();
            }}
            aria-label="Cerrar notificación"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#5f5e5e] hover:text-[#251a07] hover:bg-black/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Link>
    </div>
  );
}
