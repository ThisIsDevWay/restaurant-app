"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PairingScreen } from "./PairingScreen";
import { DisplayScreen, type ContentResponse } from "./DisplayScreen";
import { useTvRealtime } from "@/hooks/useTvRealtime";
import { supabaseBrowser } from "@/lib/supabase-client";

const STORAGE_KEY = "tv_token";
// Daypart transitions happen when time crosses a boundary — no DB row changes,
// so Realtime can't catch them. This timer re-evaluates content every 60s as
// a fallback so scheduled slides activate/deactivate on time.
const DAYPART_TICK_MS = 60_000;

type Phase = "boot" | "pairing" | "displaying";

/**
 * State machine for the Smart TV browser.
 *
 *   boot ─┬─ token in localStorage ──> displaying
 *         └─ no token              ──> pairing
 *
 *   displaying:
 *     - polls /api/tv/content every 5s
 *     - on 403: clear token, go to pairing
 *     - keeps the same items array unless the `version` hash changes
 *       (avoids carousel restart / flicker every poll)
 *
 *   pairing:
 *     - on success: store token, go to displaying
 *
 *   Also requests fullscreen + wake lock on first user gesture.
 */
export function TvController() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [token, setToken] = useState<string | null>(null);
  const [content, setContent] = useState<ContentResponse | null>(null);
  const versionRef = useRef<string | null>(null);
  const failureCountRef = useRef(0);
  const [reconnecting, setReconnecting] = useState(false);
  // In a regular browser, audio is locked until the first user gesture.
  // Inside the native Android kiosk app, `window.AndroidTV.isKioskMode()`
  // is available on mount — we detect it in a useEffect and unlock immediately.
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Detect native kiosk app and unlock audio immediately (no gesture needed).
  useEffect(() => {
    type AndroidBridge = { isKioskMode?: () => boolean };
    const bridge = (window as Window & { AndroidTV?: AndroidBridge }).AndroidTV;
    if (typeof bridge?.isKioskMode === "function" && bridge.isKioskMode()) {
      setAudioUnlocked(true);
    }
  }, []);

  // Hydrate token from localStorage or ?token= URL param (pre-provisioning).
  useEffect(() => {
    try {
      // A pre-provisioned URL contains ?token=tv_... — store it and strip from URL.
      const urlToken =
        typeof window !== "undefined"
          ? new URL(window.location.href).searchParams.get("token")
          : null;

      if (urlToken && urlToken.startsWith("tv_")) {
        try {
          window.localStorage.setItem(STORAGE_KEY, urlToken);
        } catch {
          /* ignore */
        }
        // Clean the token from the URL so it doesn't linger in browser history.
        const clean = new URL(window.location.href);
        clean.searchParams.delete("token");
        window.history.replaceState({}, "", clean.toString());
        setToken(urlToken);
        setPhase("displaying");
        return;
      }

      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      if (stored && stored.length > 0) {
        setToken(stored);
        setPhase("displaying");
      } else {
        setPhase("pairing");
      }
    } catch {
      setPhase("pairing");
    }
  }, []);

  // First-gesture handler: request fullscreen + wake lock + unlock audio.
  useEffect(() => {
    const handler = async () => {
      // Unlocking audio is the most important - it must happen synchronously
      // inside the gesture for browsers to count it as "user activation".
      setAudioUnlocked(true);
      try {
        if (
          document.documentElement.requestFullscreen &&
          !document.fullscreenElement
        ) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: string) => Promise<unknown> };
        };
        if (nav.wakeLock?.request) {
          await nav.wakeLock.request("screen").catch(() => {});
        }
      } catch {
        /* noop */
      }
    };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const pollContent = useCallback(async (currentToken: string) => {
    try {
      const orientation =
        typeof window !== "undefined" && window.screen?.orientation?.type
          ? window.screen.orientation.type
          : window.innerWidth > window.innerHeight
            ? "landscape-primary"
            : "portrait-primary";
      const size = `${window.innerWidth}x${window.innerHeight}`;
      // _t is a cache-buster against any intermediate caching layer.
      const resp = await fetch(
        `/api/tv/content?token=${encodeURIComponent(currentToken)}&orientation=${encodeURIComponent(orientation)}&size=${encodeURIComponent(size)}&_t=${Date.now()}`,
        { cache: "no-store" },
      );

      if (resp.status === 403) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setToken(null);
        setContent(null);
        versionRef.current = null;
        setPhase("pairing");
        return;
      }

      if (!resp.ok) {
        failureCountRef.current += 1;
        if (failureCountRef.current >= 3) setReconnecting(true);
        return;
      }

      const data = (await resp.json()) as ContentResponse;
      failureCountRef.current = 0;
      setReconnecting(false);

      if (versionRef.current !== data.version) {
        versionRef.current = data.version;
        setContent(data);
      } else {
        // Settings (orientation/rotation/audio/branding) may have changed even if items didn't.
        setContent((prev) =>
          prev
            ? {
                ...prev,
                orientation: data.orientation,
                rotationDegrees: data.rotationDegrees,
                audioEnabled: data.audioEnabled,
                volumePercent: data.volumePercent,
                name: data.name,
                restaurantName: data.restaurantName,
                logoUrl: data.logoUrl,
              }
            : data,
        );
      }
    } catch {
      failureCountRef.current += 1;
      if (failureCountRef.current >= 3) setReconnecting(true);
    }
  }, []);

  // Initial fetch when entering displaying phase.
  useEffect(() => {
    if (phase !== "displaying" || !token) return;
    void pollContent(token);
  }, [phase, token, pollContent]);

  // Realtime push: re-fetch when any content-related table changes.
  useTvRealtime(
    content?.displayId ?? null,
    () => { if (token) void pollContent(token); },
    (connected) => {
      // If the WebSocket drops, surface reconnecting after a short grace period
      // so the TV shows the indicator — the Supabase client auto-reconnects.
      if (!connected) setReconnecting(true);
      else { setReconnecting(false); failureCountRef.current = 0; }
    },
  );

  // 60s daypart tick: re-evaluate content at scheduled time boundaries.
  useEffect(() => {
    if (phase !== "displaying" || !token) return;
    const id = window.setInterval(() => void pollContent(token), DAYPART_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, token, pollContent]);

  // Presence: announce this TV on the shared tracker channel so the admin
  // dashboard can show online/offline status without polling the DB.
  useEffect(() => {
    if (phase !== "displaying" || !content?.displayId) return;
    const presenceChannel = supabaseBrowser.channel("tv-presence-tracker");
    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ displayId: content.displayId });
      }
    });
    return () => {
      supabaseBrowser.removeChannel(presenceChannel);
    };
  }, [phase, content?.displayId]);

  const handlePaired = useCallback((newToken: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, newToken);
    } catch {
      /* ignore */
    }
    setToken(newToken);
    versionRef.current = null;
    setContent(null);
    setPhase("displaying");
  }, []);

  if (phase === "boot") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Iniciando…
      </div>
    );
  }

  if (phase === "pairing") {
    return <PairingScreen onPaired={handlePaired} />;
  }

  return (
    <DisplayScreen
      content={content}
      reconnecting={reconnecting}
      audioUnlocked={audioUnlocked}
      onUnlockAudio={() => setAudioUnlocked(true)}
    />
  );
}
