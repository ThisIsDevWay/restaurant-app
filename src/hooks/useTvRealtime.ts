"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

/**
 * Subscribes to all DB tables that can alter a TV's content or settings.
 * When any relevant row changes, fires `onRefresh` (debounced 500ms).
 *
 * Also reports WebSocket connection state via `onConnectionChange` so the
 * caller can surface a reconnecting indicator without relying on HTTP failures.
 *
 * NOTE: All tables used here must be in the supabase_realtime publication.
 * Migration: add_tv_tables_to_realtime_publication
 */
export function useTvRealtime(
  displayId: string | null,
  onRefresh: () => void,
  onConnectionChange?: (connected: boolean) => void,
) {
  const onRefreshRef = useRef(onRefresh);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onRefreshRef.current = onRefresh;
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    if (!displayId) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => onRefreshRef.current(), 500);
    };

    const channel = supabaseBrowser
      .channel(`tv-content-${displayId}`)
      // Display config changes (orientation, audio, name, rotation).
      // tv_displays is back in the publication with the heartbeat throttled to
      // 60 s, so WAL overhead is ~85 % lower than the original every-4s polling.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tv_displays",
          filter: `id=eq.${displayId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tv_media" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_display_media",
          filter: `display_id=eq.${displayId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tv_events" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tv_event_media" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_event_assignments",
          filter: `display_id=eq.${displayId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        onConnectionChangeRef.current?.(status === "SUBSCRIBED");
      });

    return () => {
      if (debounce) clearTimeout(debounce);
      supabaseBrowser.removeChannel(channel);
    };
  }, [displayId]);
}
