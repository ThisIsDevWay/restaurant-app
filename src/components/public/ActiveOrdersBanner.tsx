"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StoredOrder {
  id: string;
  totalBsCents: number;
  createdAt: number;
}

export function ActiveOrdersBanner() {
  const [recentOrder, setRecentOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gm_orders");
      if (stored) {
        const orders: StoredOrder[] = JSON.parse(stored);
        // Show orders from last 2 hours
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const active = orders.find((o) => o.createdAt > twoHoursAgo);
        if (active) {
          setRecentOrder(active);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!recentOrder) return null;

  const shortId = recentOrder.id.slice(0, 8).toUpperCase();
  const minutesAgo = Math.floor((Date.now() - recentOrder.createdAt) / 60000);

  return (
    <Link
      href="/mis-pedidos"
      className="mx-4 mb-2 flex items-center gap-3 rounded-card border border-primary/20 bg-primary/5 px-4 py-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-sm">📋</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-main">
          Tienes un pedido activo
        </p>
        <p className="text-xs text-text-muted">
          #{shortId} · hace {minutesAgo} min
        </p>
      </div>
      <span className="text-xs font-semibold text-primary">Ver</span>
    </Link>
  );
}
