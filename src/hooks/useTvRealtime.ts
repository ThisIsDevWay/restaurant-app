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

    // The heartbeat writes last_seen_at / last_reported_* to tv_displays every
    // ~60 s. Those rows are in the realtime publication, so each beat used to
    // trigger a full content re-fetch — a self-sustaining loop (refetch writes
    // a heartbeat, which fires another event, …) that dominated DB egress.
    // We dedupe by a signature of the columns that actually affect what the TV
    // shows; heartbeat-only updates leave the signature unchanged and are
    // ignored. The first event seeds the baseline (one refetch), so a config
    // change is never missed even if it arrives before any heartbeat.
    //
    // `is_active` is part of the signature and we listen to "*" (not just
    // UPDATE) so that BOTH revocation paths push the TV back to pairing without
    // polling: revoke (is_active → false, an UPDATE) flips the signature, and a
    // hard delete (DELETE event) refreshes unconditionally. Either way the next
    // /api/tv/content fetch returns 403 and the controller clears its token.
    let lastConfigSig: string | null = null;
    const handleDisplayChange = (payload: {
      eventType?: string;
      new?: Record<string, unknown>;
    }) => {
      if (payload.eventType === "DELETE") {
        scheduleRefresh();
        return;
      }
      const row = payload.new;
      if (!row || !row.id) {
        return; // Avoid refresh loop on empty/partial payloads (e.g. RLS filtering)
      }
      const sig = [
        row.is_active,
        row.orientation,
        row.rotation_degrees,
        row.audio_enabled,
        row.volume_percent,
        row.name,
      ].join("|");
      if (sig === lastConfigSig) return; // heartbeat-only beat — ignore
      lastConfigSig = sig;
      scheduleRefresh();
    };

    const channel = supabaseBrowser
      .channel(`tv-content-${displayId}`)
      // Display config + revocation changes. Heartbeat writes to the same row
      // are filtered out by handleDisplayChange so they no longer trigger a
      // content re-fetch.
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_displays",
          filter: `id=eq.${displayId}`,
        },
        handleDisplayChange,
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
