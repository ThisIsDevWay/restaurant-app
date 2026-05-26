"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-client";
import { todayCaracas } from "@/lib/utils/date";

export type POSConnectionStatus = "connecting" | "ok" | "error";

type AvailabilityMap = Map<string, boolean>;

/** Each daily_* table keys the underlying menu-item UUID under a different column. */
const TABLE_ID_COLUMN = {
  daily_menu_items: "menu_item_id",
  daily_bebidas: "bebida_item_id",
  daily_contornos: "contorno_item_id",
  daily_adicionales: "adicional_item_id",
} as const;

type DailyTable = keyof typeof TABLE_ID_COLUMN;

interface UsePOSRealtimeOptions {
  /**
   * Called with a partial availability map ({ menuItemId -> isAvailable }) on every
   * realtime UPDATE. The consumer merges it into local menu state and enforces the
   * cart. Mirrors the legacy useMenuAvailability callback contract.
   */
  onAvailabilityChange?: (map: AvailabilityMap) => void;
  /** Called when the channel errors/times out, so the consumer can refetch fresh data. */
  onResync?: () => void;
}

/**
 * Subscribes to live availability (is_available) changes on the four daily_* tables
 * for today (America/Caracas). Pushes updates in <100ms — no polling. Used by the
 * internal POS only; the public menu keeps its 45s polling hook.
 */
export function usePOSRealtime({ onAvailabilityChange, onResync }: UsePOSRealtimeOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<POSConnectionStatus>("connecting");

  // Keep latest callbacks in refs so the effect can stay mount-only (no resubscribe churn).
  const onChangeRef = useRef(onAvailabilityChange);
  const onResyncRef = useRef(onResync);
  onChangeRef.current = onAvailabilityChange;
  onResyncRef.current = onResync;

  useEffect(() => {
    const today = todayCaracas();

    const handleUpdate = (table: DailyTable) =>
      (payload: RealtimePostgresUpdatePayload<Record<string, unknown>>) => {
        const row = payload.new;
        if (!row) return;
        // Defensive: realtime filter should already scope to today.
        if (row.date && row.date !== today) return;
        const id = row[TABLE_ID_COLUMN[table]] as string | undefined;
        if (!id) return;
        const map: AvailabilityMap = new Map();
        map.set(id, Boolean(row.is_available));
        onChangeRef.current?.(map);
      };

    let channel = supabaseBrowser.channel(`pos-availability-${Date.now()}`);

    (Object.keys(TABLE_ID_COLUMN) as DailyTable[]).forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `date=eq.${today}` },
        handleUpdate(table),
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnectionStatus("ok");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionStatus("error");
        onResyncRef.current?.();
      }
    });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return { connectionStatus };
}
