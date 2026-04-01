"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-[100] flex items-center gap-2 bg-amber px-4 py-2.5 text-[13px] font-medium text-white">
      <WifiOff size={16} />
      Sin conexión — el menú está disponible pero no puedes hacer pedidos ahora
    </div>
  );
}
