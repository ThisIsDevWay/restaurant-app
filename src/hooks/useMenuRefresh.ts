"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";

/**
 * Listens for structural changes to the public menu data and calls
 * router.refresh() so the RSC re-executes and passes fresh props to MenuClient.
 *
 * Covers events that useMenuAvailability does NOT handle:
 *   - Items added/removed from today's daily menu
 *   - Adicionales/bebidas added/removed from today's selection
 *   - Price or name changes on menu_items
 *   - Settings toggles (adicionalesEnabled, bebidasEnabled, menuLayout…)
 *
 * Availability-only changes (UPDATE on daily_* isAvailable column) are
 * intentionally left to useMenuAvailability to avoid double refreshes.
 */
export function useMenuRefresh() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => routerRef.current.refresh(), 600);
    };

    const channel = supabaseBrowser
      .channel("menu-structural-refresh")
      // New plate added to / removed from today's menu
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_menu_items" }, scheduleRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "daily_menu_items" }, scheduleRefresh)
      // Adicionales added/removed from today's selection
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_adicionales" }, scheduleRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "daily_adicionales" }, scheduleRefresh)
      // Bebidas added/removed from today's selection
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_bebidas" }, scheduleRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "daily_bebidas" }, scheduleRefresh)
      // Price / name / description changes on catalog items
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "menu_items" }, scheduleRefresh)
      // Admin settings toggles (adicionalesEnabled, bebidasEnabled, menuLayout…)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (debounce) clearTimeout(debounce);
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
