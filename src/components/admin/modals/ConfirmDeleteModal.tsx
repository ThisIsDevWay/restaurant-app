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
import { Trash2, AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  tableLabel: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  tableLabel,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={!!tableLabel} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm rounded-3xl border-none bg-white p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4 text-[#bb0005]">
            <AlertTriangle size={32} />
          </div>
          <DialogTitle className="font-display text-xl font-black text-[#251a07]">
            ¿Eliminar {tableLabel}?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#9a7a5a]">
            Esta acción no se puede deshacer. Se eliminarán permanentemente todos los datos asociados a esta mesa.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
          <Button
            onClick={onConfirm}
            className="w-full rounded-xl bg-[#bb0005] font-bold text-white hover:bg-[#9a0004]"
          >
            <Trash2 size={16} className="mr-2" />
            Sí, Eliminar Mesa
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
