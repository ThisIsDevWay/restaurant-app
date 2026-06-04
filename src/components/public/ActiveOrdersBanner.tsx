"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoredOrder {
  id: string;
  totalBsCents: number;
  createdAt: number;
}

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "expired"]);

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

        if (res.ok) {
          const { status } = (await res.json()) as { status: string };
          if (TERMINAL_STATUSES.has(status)) {
            // Order is done — clean up localStorage and stay hidden
            removeOrderFromStorage(candidate.id);
            return;
          }
        } else if (res.status === 404) {
          // Order doesn't exist anymore
          removeOrderFromStorage(candidate.id);
          return;
        }

        // Order is still active — show the banner
        if (!cancelled) setRecentOrder(candidate);
      } catch {
        // Network error: fall back to showing banner (fail-open)
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!recentOrder) return null;

  const shortId = recentOrder.id.slice(-6).toUpperCase();
  const minutesAgo = Math.max(0, Math.floor((Date.now() - recentOrder.createdAt) / 60000));

  return (
    <div className="px-5 mb-4 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link
        href="/mis-pedidos"
        className={cn(
          "flex items-center gap-3.5 px-4.5 py-3.5 rounded-[18px] border transition-all active:scale-[0.99] shadow-sm",
          "bg-primary/5 hover:bg-primary/10 border-primary/20"
        )}
      >
        {/* Pulsating Indicator & Icon */}
        <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Clock className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-text-main leading-tight">
            Tienes un pedido activo en curso
          </p>
          <p className="text-[11px] text-text-muted mt-0.5 leading-none">
            Pedido #{shortId} · hace {minutesAgo === 0 ? "unos instantes" : `${minutesAgo} min`}
          </p>
        </div>

        {/* Action Link */}
        <span className="text-[12px] font-bold text-primary hover:underline shrink-0">
          Seguir pedido →
        </span>
      </Link>
    </div>
  );
}
