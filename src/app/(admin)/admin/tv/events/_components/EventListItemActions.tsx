"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Edit, Power, PowerOff, Trash2 } from "lucide-react";
import {
  updateTvEventAction,
  deleteTvEventAction,
} from "@/actions/tv";

export function EventListItemActions({
  eventId,
  isActive,
}: {
  eventId: string;
  isActive: boolean;
}) {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const toggleActive = async () => {
    setBusy(true);
    const res = await updateTvEventAction({ id: eventId, isActive: !isActive });
    setBusy(false);
    if (res?.data?.success) {
      toast.success(isActive ? "Evento desactivado" : "Evento activado");
      startTransition(() => {});
      // Hard reload list - simplest way to reflect SSR badge.
      window.location.reload();
    } else {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Eliminar evento",
      description: "¿Eliminar este evento? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await deleteTvEventAction({ id: eventId });
    setBusy(false);
    if (res?.data?.success) {
      toast.success("Evento eliminado");
      window.location.reload();
    } else {
      toast.error("Error al eliminar");
    }
  };

  return (
    <>
    <div className="flex items-center gap-2">
      <Link href={`/admin/tv/events/${eventId}`}>
        <Button
          variant="ghost"
          size="sm"
          className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-4 h-8 text-xs transition-all active:scale-[0.96] flex items-center gap-1.5 shadow-sm"
        >
          <Edit className="h-3.5 w-3.5" />
          Editar
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleActive}
        disabled={busy}
        className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-4 h-8 text-xs transition-all active:scale-[0.96] flex items-center gap-1.5 shadow-sm"
      >
        {isActive ? (
          <>
            <PowerOff className="h-3.5 w-3.5" />
            Desactivar
          </>
        ) : (
          <>
            <Power className="h-3.5 w-3.5" />
            Activar
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={busy}
        className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-full transition-all active:scale-[0.96] h-8 w-8 p-0 flex items-center justify-center shadow-sm"
        title="Eliminar evento"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    {confirmDialog}
    </>
  );
}
