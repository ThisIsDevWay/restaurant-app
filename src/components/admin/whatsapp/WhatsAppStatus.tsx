"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, Wifi, WifiOff, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhatsAppStatusData {
  status: "connected" | "disconnected" | "connecting";
  qr?: string;
}

export function WhatsAppStatus() {
  const [data, setData] = useState<WhatsAppStatusData>({ status: "disconnected" });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    // Only fetch if the tab is active to save Vercel serverless resources
    if (document.visibilityState !== "visible") return;

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
    // 45s interval is enough for status check and saves compute costs
    const interval = setInterval(fetchStatus, 45_000);
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
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-full ${isConnected ? "bg-success/10" : "bg-error/10"}`}>
          {isConnected ? (
            <Wifi className={`h-4 w-4 ${isConnected ? "text-success" : "text-error"}`} />
          ) : (
            <WifiOff className="h-4 w-4 text-error" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-text-muted leading-none mb-1">
            Conexión WhatsApp
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`rounded-md h-5 px-1.5 text-[10px] uppercase font-bold border-none ${loading ? "bg-muted text-text-muted" :
                isConnected ? "bg-success/10 text-success" : "bg-error/10 text-error"
                }`}
            >
              {loading ? "Verificando..." : isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {!isConnected && hasQR && (
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" size="sm" className="h-8 rounded-xl gap-2 border-border/60 hover:border-primary/40 hover:bg-primary/5">
                <QrCode className="h-3.5 w-3.5" />
                Vincular Dispositivo
              </Button>
            } />
            <DialogContent className="sm:max-w-md rounded-3xl border-none">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-center">Vincular WhatsApp</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <div className="p-4 bg-white rounded-3xl border-2 border-primary/20 shadow-2xl shadow-primary/10">
                  <Image
                    src={`data:image/png;base64,${data.qr}`}
                    alt="QR Code WhatsApp"
                    width={256}
                    height={256}
                    className="h-64 w-64"
                  />
                </div>
                <div className="text-center space-y-2 max-w-[280px]">
                  <p className="text-sm font-bold text-text-main">Escanea el código desde tu teléfono</p>
                  <p className="text-xs text-text-muted">Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="h-8 rounded-xl gap-2 border-border/60 hover:bg-muted"
        >
          {isReconnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {isReconnecting ? "Reconectando..." : "Refrescar"}
          </span>
        </Button>
      </div>
    </div>
  );
}
