"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface WhatsAppStatusData {
  status: "connected" | "disconnected" | "connecting";
  qr?: string;
}

export function WhatsAppStatus() {
  const [data, setData] = useState<WhatsAppStatusData>({ status: "disconnected" });
  const [showQR, setShowQR] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      setData({ status: "disconnected" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await fetch("/api/admin/whatsapp/reconnect", { method: "POST" });
      setTimeout(fetchStatus, 2000);
    } catch {
      // ignore
    } finally {
      setIsReconnecting(false);
    }
  };

  const isConnected = data.status === "connected";
  const hasQR = !!data.qr;

  return (
    <div className="rounded-card border border-border bg-white p-4 shadow-card">
      <p className="mb-3 text-sm font-semibold text-text-main">
        Estado de WhatsApp
      </p>

      {/* Status badge */}
      <div className="mb-4 flex items-center gap-3">
        {isConnected ? (
          <Wifi className="h-5 w-5 text-success" />
        ) : (
          <WifiOff className="h-5 w-5 text-error" />
        )}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${isConnected
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error"
            }`}
        >
          {loading
            ? "Verificando..."
            : isConnected
              ? "Conectado"
              : "Desconectado"}
        </span>
      </div>

      {/* QR Code */}
      {!isConnected && hasQR && (
        <div className="mb-4">
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-sm text-primary underline"
          >
            {showQR ? "Ocultar QR" : "Mostrar QR para escanear"}
          </button>
          {showQR && (
            <div className="mt-3 flex justify-center rounded-lg border border-border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${data.qr}`}
                alt="QR Code WhatsApp"
                className="h-64 w-64"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="flex items-center gap-2 rounded-input border border-border px-4 py-2 text-sm font-medium text-text-main hover:bg-muted disabled:opacity-60"
        >
          {isReconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isReconnecting ? "Reconectando..." : "Forzar reconexión"}
        </button>
      </div>
    </div>
  );
}
