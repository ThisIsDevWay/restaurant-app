"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, Printer } from "lucide-react";
import QRCode from "react-qr-code";

interface QrPreviewModalProps {
  tableId: string | null;
  tableName: string | undefined;
  onClose: () => void;
  onRegen: (id: string) => void;
}

export function QrPreviewModal({
  tableId,
  tableName,
  onClose,
  onRegen,
}: QrPreviewModalProps) {
  if (!tableId) return null;

  // En producción esto debería ser una URL absoluta
  const qrUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/?table=${tableId}`
    : `https://app.gm.com/?table=${tableId}`;

  return (
    <Dialog open={!!tableId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs rounded-3xl bg-white border-none p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 rounded-2xl bg-[#fff2e2] p-3 text-[#bb0005]">
            <QrCode size={24} />
          </div>
          <DialogTitle className="font-display text-xl font-black text-[#251a07]">
            QR — {tableName}
          </DialogTitle>
          <p className="text-[10px] uppercase tracking-widest text-[#9a7a5a]">
            Escanea para ver el menú
          </p>
        </DialogHeader>

        <div className="my-6 flex justify-center rounded-2xl bg-[#fff8f3] p-6 ring-1 ring-[#e9e2d9]">
          <QRCode value={qrUrl} size={160} />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full rounded-xl bg-[#251a07] font-bold text-white hover:bg-[#3d2c0d]"
            onClick={() => window.print()}
          >
            <Printer size={16} className="mr-2" />
            Imprimir Código
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-xl text-[#9a7a5a] hover:bg-[#fff2e2]"
            onClick={() => onRegen(tableId)}
          >
            <RefreshCw size={14} className="mr-2" />
            Regenerar Token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
