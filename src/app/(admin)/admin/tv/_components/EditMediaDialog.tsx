"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import * as v from "valibot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TvMedia } from "@/db/schema/tv";
import { updateTvMediaAction } from "@/actions/tv";

export type CategoryLite = {
  id: string;
  name: string;
  sortOrder: number;
  isAvailable: boolean;
};

/* ── Daypart helpers ──────────────────────────────────────── */

function minutesToTime(m: number | null | undefined): string {
  if (m == null) return "";
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function timeToMinutes(t: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

/* ─────────────────────────────────────────────────────────── */

type Props = {
  item: TvMedia;
  categories: CategoryLite[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditMediaDialog({ item, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(item.title);
  const [duration, setDuration] = useState(String(item.durationSeconds));
  const [isActive, setIsActive] = useState(item.isActive);
  const [muted, setMuted] = useState(item.muted);
  const [submitting, setSubmitting] = useState(false);

  // Dayparting
  const [daypartEnabled, setDaypartEnabled] = useState(
    item.daypartStartMinutes != null ||
      item.daypartEndMinutes != null ||
      item.daypartDaysMask != null,
  );
  const [startTime, setStartTime] = useState(
    minutesToTime(item.daypartStartMinutes),
  );
  const [endTime, setEndTime] = useState(minutesToTime(item.daypartEndMinutes));
  const [daysMask, setDaysMask] = useState<number>(
    item.daypartDaysMask ?? 0b1111111,
  );

  useEffect(() => {
    setTitle(item.title);
    setDuration(String(item.durationSeconds));
    setIsActive(item.isActive);
    setMuted(item.muted);
    const hasDaypart =
      item.daypartStartMinutes != null ||
      item.daypartEndMinutes != null ||
      item.daypartDaysMask != null;
    setDaypartEnabled(hasDaypart);
    setStartTime(minutesToTime(item.daypartStartMinutes));
    setEndTime(minutesToTime(item.daypartEndMinutes));
    setDaysMask(item.daypartDaysMask ?? 0b1111111);
  }, [item]);

  const toggleDay = (bit: number) =>
    setDaysMask((prev) => (prev & bit ? prev & ~bit : prev | bit));

  const handleSave = async () => {
    const dur = Number(duration);
    if (!title.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    if (!Number.isInteger(dur) || dur < 1 || dur > 600) {
      toast.error("La duración debe estar entre 1 y 600 segundos");
      return;
    }

    setSubmitting(true);
    const res = await updateTvMediaAction({
      id: item.id,
      title: title.trim(),
      durationSeconds: dur,
      isActive,
      muted,
      daypartStartMinutes: daypartEnabled ? timeToMinutes(startTime) : null,
      daypartEndMinutes: daypartEnabled ? timeToMinutes(endTime) : null,
      daypartDaysMask: daypartEnabled ? daysMask : null,
    });
    setSubmitting(false);

    if (res?.data?.success) {
      toast.success("Medio actualizado");
      onSaved();
    } else {
      toast.error("Error al guardar");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 flex flex-col gap-0 rounded-2xl border-border bg-surface-section overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-lg font-bold text-text-main pr-8">
            Editar medio
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Título
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="bg-bg-app border-border rounded-xl"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Duración (segundos)
            </Label>
            <Input
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-bg-app border-border rounded-xl"
            />
            <p className="text-[10px] text-text-muted">
              Tiempo que se mostrará este elemento en pantalla antes de pasar al siguiente.
            </p>
          </div>

          {/* Active + Muted row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg-app px-4 py-3">
              <Label className="text-xs font-semibold text-text-main">Activo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            {item.type === "video" && (
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg-app px-4 py-3">
                <Label className="text-xs font-semibold text-text-main">Silenciado</Label>
                <Switch checked={muted} onCheckedChange={setMuted} />
              </div>
            )}
          </div>

          {/* Dayparting */}
          <div className="rounded-xl border border-border/60 bg-bg-app/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div>
                <p className="text-xs font-bold text-text-main">Programación horaria</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Limita el horario en que se muestra este elemento
                </p>
              </div>
              <Switch checked={daypartEnabled} onCheckedChange={setDaypartEnabled} />
            </div>

            {daypartEnabled && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Desde
                    </Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-bg-app border-border rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Hasta
                    </Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-bg-app border-border rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Días activos
                  </Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((day, i) => {
                      const bit = 1 << i;
                      const active = Boolean(daysMask & bit);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(bit)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            active
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-bg-app text-text-muted border-border hover:border-primary/40 hover:text-text-main"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border/40 bg-bg-app/40 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl border-border">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting}
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/5"
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
