"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    if (!confirm("¿Eliminar este evento?")) return;
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
    <div className="flex items-center gap-2">
      <Link href={`/admin/tv/events/${eventId}`}>
        <Button variant="outline" size="sm">
          <Edit className="h-3.5 w-3.5" />
          Editar
        </Button>
      </Link>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleActive}
        disabled={busy}
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
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={busy}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
