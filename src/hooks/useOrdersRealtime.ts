"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

/**
 * Subscribes to INSERT and UPDATE events on the `orders` table via Supabase
 * Realtime. When any order is created or changes status, fires `onOrderChange`
 * so the consumer can refetch the full list from the auth-gated API.
 *
 * This replaces the 8s polling in the POS (waiter/caja) panels. The public
 * customer-facing pages do NOT use this hook.
 *
 * Design: We intentionally ignore the Realtime payload and use it only as a
 * signal to trigger a full refetch via `/api/active-orders`. This keeps the
 * data flow secure (full order details are still served through the auth-gated
 * API route) and avoids trusting the Realtime payload shape.
 */
export function useOrdersRealtime(onOrderChange: () => void) {
  const onChangeRef = useRef(onOrderChange);
  onChangeRef.current = onOrderChange;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefetch = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => onChangeRef.current(), 300);
    };

    const channel = supabaseBrowser
      .channel(`pos-orders-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      if (debounce) clearTimeout(debounce);
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
