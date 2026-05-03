"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ConfirmRegenModalProps {
  tableLabel: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmRegenModal({
  tableLabel,
  onConfirm,
  onCancel,
}: ConfirmRegenModalProps) {
  return (
    <Dialog open={!!tableLabel} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm rounded-3xl border-none bg-white p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-4 rounded-full bg-amber-50 p-4 text-amber-600">
            <AlertTriangle size={32} />
          </div>
          <DialogTitle className="font-display text-xl font-black text-[#251a07]">
            ¿Regenerar Token?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#9a7a5a]">
            El código QR actual de <b>{tableLabel}</b> dejará de funcionar inmediatamente. Deberás imprimir y colocar el nuevo código.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
          <Button
            onClick={onConfirm}
            className="w-full rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Regenerar y Desactivar Antiguo
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full rounded-xl text-[#9a7a5a] hover:bg-slate-50"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
