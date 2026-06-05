import { useEffect, useRef } from "react";

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
  // Stable ref so the mount-only effect always calls the latest callback without
  // recreating the Supabase channel on every render (previous leak source).
  const onChangeRef = useRef(onAvailabilityChange);
  onChangeRef.current = onAvailabilityChange;

  useEffect(() => {
    let cancelled = false;
    let removeChannel: (() => void) | null = null;

    const fetchAndNotify = async () => {
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

        onChangeRef.current(map);
      } catch {
        // silently fail — don't interrupt UX
      }
    };

    fetchAndNotify();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchAndNotify();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void fetchAndNotify(), 300);
    };

    // Dynamic import keeps @supabase/supabase-js out of the initial menu bundle.
    void (async () => {
      const { supabaseBrowser } = await import("@/lib/supabase-client");
      if (cancelled) return;
      const channel = supabaseBrowser
        .channel("menu-availability")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daily_menu_items" }, scheduleRefresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daily_bebidas" }, scheduleRefresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daily_contornos" }, scheduleRefresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daily_adicionales" }, scheduleRefresh)
        .subscribe();
      removeChannel = () => supabaseBrowser.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("visibilitychange", handleVisibility);
      removeChannel?.();
    };
  }, []); // mount-only: ref pattern keeps callback stable
}
