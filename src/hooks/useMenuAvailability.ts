import { useEffect, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

type AvailabilityMap = Map<string, boolean>;

interface AvailabilityResponse {
  platos: { id: string; isAvailable: boolean }[];
  adicionales: { id: string; isAvailable: boolean }[];
  bebidas: { id: string; isAvailable: boolean }[];
  contornos: { id: string; isAvailable: boolean }[];
}

export function useMenuAvailability(
  onAvailabilityChange: (map: AvailabilityMap) => void,
) {
  const fetchAndNotify = useCallback(async () => {
    try {
      const res = await fetch("/api/menu/availability", { cache: "no-store" });
      if (!res.ok) return;
      const data: AvailabilityResponse = await res.json();

      const map: AvailabilityMap = new Map();
      [
        ...data.platos,
        ...data.adicionales,
        ...data.bebidas,
        ...data.contornos,
      ].forEach((item) => {
        map.set(item.id, item.isAvailable);
      });

      onAvailabilityChange(map);
    } catch {
      // silently fail — don't interrupt UX
    }
  }, [onAvailabilityChange]);

  useEffect(() => {
    fetchAndNotify();

    // Refresh when tab becomes visible after being hidden
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAndNotify();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Push-based updates: re-fetch whenever any daily availability row changes
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void fetchAndNotify(), 300);
    };

    const channel = supabaseBrowser
      .channel("menu-availability")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_menu_items" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_bebidas" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_contornos" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_adicionales" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabaseBrowser.removeChannel(channel);
    };
  }, [fetchAndNotify]);
}
