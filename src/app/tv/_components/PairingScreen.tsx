"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 4s poll = 15 req/min, comfortably under the tvPairCheck rate limit (60/min)
// even with several TVs pairing behind one NAT. Pairing is a short-lived screen
// shown only until an admin links the device, so 4s detection latency is fine.
const PAIR_POLL_MS = 4000;

type Props = {
  onPaired: (token: string) => void;
};

type Session = {
  pairingCode: string;
  expiresAt: string;
};

/**
 * Full-screen pairing UI. Shows a giant 4-digit code, polls /api/tv/pair/check
 * every 3 seconds, and refreshes the code automatically when it expires.
 */
export function PairingScreen({ onPaired }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestingRef = useRef(false);

  const requestNewCode = useCallback(async () => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    try {
      const resp = await fetch("/api/tv/pair/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        setError("Sin conexión. Reintentando…");
        return;
      }
      const data = (await resp.json()) as Session;
      setSession(data);
      setError(null);
    } catch {
      setError("Sin conexión. Reintentando…");
    } finally {
      requestingRef.current = false;
    }
  }, []);

  // Initial code request.
  useEffect(() => {
    void requestNewCode();
  }, [requestNewCode]);

  // Live countdown clock.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Polling for pairing status.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const resp = await fetch(
          `/api/tv/pair/check?code=${encodeURIComponent(session.pairingCode)}`,
          { cache: "no-store" },
        );
        if (!resp.ok) return;
        const data = (await resp.json()) as
          | { status: "pending" }
          | { status: "expired" }
          | { status: "not_found" }
          | { status: "linked"; displayToken: string };
        if (cancelled) return;
        if (data.status === "linked") {
          onPaired(data.displayToken);
        } else if (data.status === "expired" || data.status === "not_found") {
          // Refresh: ask for a brand-new code.
          await requestNewCode();
        }
      } catch {
        /* keep polling */
      }
    }, PAIR_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session, onPaired, requestNewCode]);

  // Auto-refresh code when it crosses the expiry timestamp.
  useEffect(() => {
    if (!session) return;
    const expiry = new Date(session.expiresAt).getTime();
    if (now >= expiry) void requestNewCode();
  }, [now, session, requestNewCode]);

  const remainingSec = session
    ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000))
    : 0;
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "4vh 4vw",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "#f59e0b",
          marginBottom: "1.5vh",
        }}
      >
        Restaurante G y M
      </div>
      <div
        style={{
          fontSize: "clamp(1rem, 2vw, 1.5rem)",
          opacity: 0.7,
          marginBottom: "5vh",
        }}
      >
        Conectando pantalla…
      </div>

      <div
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: "clamp(8rem, 22vw, 18rem)",
          fontWeight: 800,
          letterSpacing: "0.18em",
          lineHeight: 1,
          background: "rgba(255,255,255,0.04)",
          padding: "4vh 6vw",
          borderRadius: "2vw",
          border: "1px solid rgba(255,255,255,0.08)",
          minWidth: "60vw",
          minHeight: "30vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {session ? session.pairingCode : "····"}
      </div>

      <div
        style={{
          marginTop: "5vh",
          fontSize: "clamp(0.9rem, 1.6vw, 1.4rem)",
          opacity: 0.85,
          maxWidth: "80vw",
        }}
      >
        Ingresa este código en el panel de administración
        <br />
        <span style={{ opacity: 0.55 }}>Admin → Smart TVs → Emparejar nueva TV</span>
      </div>

      <div
        style={{
          marginTop: "4vh",
          fontSize: "clamp(0.8rem, 1.3vw, 1.1rem)",
          opacity: 0.5,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        Expira en {mm}:{ss}
      </div>

      {error && (
        <div
          style={{
            marginTop: "2vh",
            fontSize: "clamp(0.8rem, 1.2vw, 1rem)",
            color: "#ef4444",
            opacity: 0.8,
          }}
        >
          {error}
        </div>
      )}

      {/* Animated dots */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "3vh",
          fontSize: "clamp(0.8rem, 1.2vw, 1rem)",
          opacity: 0.3,
          letterSpacing: "0.5em",
        }}
      >
        <DotsAnimation />
      </div>
    </div>
  );
}

function DotsAnimation() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 500);
    return () => window.clearInterval(id);
  }, []);
  return <span>{".".repeat(tick) || " "}</span>;
}
