"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { todayCaracas } from "@/lib/utils/date";

const DAILY_TABLES = [
  "daily_menu_items",
  "daily_bebidas",
  "daily_contornos",
  "daily_adicionales",
] as const;

export interface POSMenuPayload {
  items: unknown[];
  categories: unknown[];
  dailyAdicionales: unknown[];
  dailyBebidas: unknown[];
  allContornos: unknown[];
  settings: Record<string, unknown> | null;
}

/**
 * Detects structural changes to today's daily menu (admin adds/removes a dish,
 * bebida, contorno or adicional → INSERT/DELETE on a daily_* table) and refetches
 * the full menu from the uncached /api/internal/menu endpoint. Availability-only
 * UPDATEs are handled by usePOSRealtime instead.
 */
export function usePOSMenuSync(onMenuRefetch: (menu: POSMenuPayload) => void) {
  const onRefetchRef = useRef(onMenuRefetch);
  onRefetchRef.current = onMenuRefetch;

  useEffect(() => {
    const today = todayCaracas();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let aborted = false;

    const refetch = async () => {
      try {
        const res = await fetch("/api/internal/menu", { cache: "no-store" });
        if (!res.ok || aborted) return;
        const data = (await res.json()) as POSMenuPayload;
        if (!aborted) onRefetchRef.current(data);
      } catch {
        // swallow — realtime will fire again on the next change
      }
    };

    const scheduleRefetch = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refetch, 400);
    };

    let channel = supabaseBrowser.channel(`pos-menu-sync-${Date.now()}`);

    DAILY_TABLES.forEach((table) => {
      channel = channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, filter: `date=eq.${today}` },
          scheduleRefetch,
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table },
          scheduleRefetch,
        );
    });

    channel.subscribe();

    return () => {
      aborted = true;
      if (debounce) clearTimeout(debounce);
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
