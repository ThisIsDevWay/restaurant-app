"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Tv,
  Clock,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Film,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { TvDisplay } from "@/db/schema/tv";
import { revokeTvDisplayAction, deleteTvDisplayAction } from "@/actions/tv";

export function DisplayRow({
  display,
  isOnline,
  onEdit,
  onConfigureMedia,
  onChange,
}: {
  display: TvDisplay & { hasOwnMedia?: boolean };
  isOnline: boolean;
  onEdit: () => void;
  onConfigureMedia: () => void;
  onChange: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastSeenMs = display.lastSeenAt
    ? Date.now() - new Date(display.lastSeenAt).getTime()
    : Infinity;
  
  const lastSeenText = !mounted
    ? "Cargando..."
    : lastSeenMs === Infinity
      ? "Nunca visto"
      : lastSeenMs < 10_000
        ? "En línea"
        : lastSeenMs < 30_000
          ? "Hace unos segundos"
          : lastSeenMs < 60_000
            ? `Hace ${Math.floor(lastSeenMs / 1000)}s`
            : lastSeenMs < 3_600_000
              ? `Hace ${Math.floor(lastSeenMs / 60_000)}m`
              : lastSeenMs < 86_400_000
                ? `Hace ${Math.floor(lastSeenMs / 3_600_000)}h`
                : new Date(display.lastSeenAt!).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "short",
                  });

  const handleRevoke = async () => {
    const ok = await confirm({
      title: "Revocar acceso",
      description: `"${display.name}" volverá al modo de emparejamiento.`,
      confirmLabel: "Revocar",
      destructive: true,
    });
    if (!ok) return;
    const res = await revokeTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV revocada");
      onChange();
    } else {
      toast.error("Error al revocar");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Eliminar TV",
      description: `¿Eliminar permanentemente "${display.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV eliminada");
      onChange();
    } else {
      toast.error("Error al eliminar");
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 gap-4 hover:bg-amber-500/[0.01] transition-all duration-200">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 shadow-sm border border-amber-500/15">
            <Tv className={cn("h-5 w-5", display.orientation === "portrait" && "rotate-90")} />
          </div>
          
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-text-main truncate max-w-[200px] sm:max-w-[300px]">
                {display.name}
              </h4>
              {!display.isActive ? (
                <Badge variant="destructive" className="text-[9px] px-1.5 h-4.5 font-bold uppercase tracking-wider">Revocada</Badge>
              ) : (
                <>
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 h-4.5 border font-bold uppercase tracking-wider",
                      isOnline
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                  {!display.hasOwnMedia && (
                    <Badge variant="outline" className="text-[9px] px-1.5 h-4.5 border-amber-500/40 text-amber-700 bg-amber-500/5 font-bold uppercase tracking-wider">
                      Contenido global
                    </Badge>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Actividad: {lastSeenText}</span>
              </div>
              
              <span className="text-border/60 font-light">•</span>
              
              <div>
                <span>Orientación: </span>
                <span className="text-text-main font-semibold capitalize">
                  {display.orientation === "auto" ? "Automática" : display.orientation === "landscape" ? "Horizontal" : "Vertical"}
                </span>
                {display.rotationDegrees > 0 && ` (+${display.rotationDegrees}°)`}
              </div>

              {display.lastReportedSize && (
                <>
                  <span className="text-border/60 font-light">•</span>
                  <div className="font-mono">
                    <span className="font-sans text-text-muted">Resolución: </span>
                    <span className="text-text-main font-semibold">{display.lastReportedSize}</span>
                  </div>
                </>
              )}

              <span className="text-border/60 font-light">•</span>

              <div className="flex items-center gap-1">
                {display.audioEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Audio: <strong className="text-text-main">{display.volumePercent}%</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Silenciado</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 text-[11px] font-semibold border-border hover:bg-amber-500/5 hover:border-amber-500/20 hover:text-amber-700 rounded-lg px-3"
          >
            <SettingsIcon className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigureMedia}
            className="h-8 text-[11px] font-semibold border-border hover:bg-blue-500/5 hover:border-blue-500/20 hover:text-blue-700 rounded-lg px-3"
          >
            <Film className="h-3.5 w-3.5 mr-1" />
            Medios
          </Button>
          {display.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevoke}
              className="h-8 text-[11px] font-semibold border-border hover:bg-rose-500/5 hover:border-rose-500/20 hover:text-rose-600 rounded-lg px-3"
            >
              Revocar
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="h-8 text-[11px] font-semibold shadow-sm rounded-lg px-3"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
  );
}
