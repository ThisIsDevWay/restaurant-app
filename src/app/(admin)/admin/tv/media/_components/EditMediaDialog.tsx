"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateTvMediaAction } from "@/actions/tv";
import type { TvMedia, TvMenuBoardConfig } from "@/db/schema/tv";
import {
  DAY_LABELS_ES,
  formatMinuteOfDay,
  parseMinuteOfDay,
} from "@/lib/services/tv-dayparting";
import type { CategoryLite } from "./MediaClient";
import { MenuBoardConfigForm } from "./MenuBoardDialog";

export function DaypartingFields({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  daysMask,
  setDaysMask,
}: {
  startTime: string;
  setStartTime: (s: string) => void;
  endTime: string;
  setEndTime: (s: string) => void;
  daysMask: number;
  setDaysMask: (n: number) => void;
}) {
  const toggleDay = (bit: number) => {
    setDaysMask(daysMask ^ (1 << bit));
  };
  return (
    <div className="space-y-3 pl-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="dp-start">Desde</Label>
          <Input
            id="dp-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dp-end">Hasta</Label>
          <Input
            id="dp-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-text-muted -mt-1">
        Si dejas ambos en blanco se ignora la franja horaria. Si la hora final
        es menor que la inicial el bloque cruza la medianoche (ej. 22:00 → 02:00).
      </p>

      <div>
        <Label>Días activos</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DAY_LABELS_ES.map((d) => {
            const active = (daysMask & (1 << d.bit)) !== 0;
            return (
              <button
                key={d.bit}
                type="button"
                onClick={() => toggleDay(d.bit)}
                className={`text-xs rounded-md border px-2.5 py-1 transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-surface-section text-text-muted"
                }`}
                title={d.full}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-1">
          {daysMask === 127
            ? "Todos los días"
            : daysMask === 0
              ? "⚠ Sin días marcados — el medio no se reproducirá"
              : `${[...Array(7)].filter((_, i) => (daysMask & (1 << i)) !== 0).length} día(s) seleccionado(s)`}
        </p>
      </div>
    </div>
  );
}

export function EditMediaDialog({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: TvMedia;
  categories: CategoryLite[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [durationSeconds, setDurationSeconds] = useState(item.durationSeconds);
  const [isActive, setIsActive] = useState(item.isActive);
  const [muted, setMuted] = useState(item.muted);
  const [submitting, setSubmitting] = useState(false);

  // Dayparting state.
  const [enableDaypart, setEnableDaypart] = useState(
    item.daypartStartMinutes != null ||
      item.daypartEndMinutes != null ||
      item.daypartDaysMask != null,
  );
  const [startTime, setStartTime] = useState<string>(
    formatMinuteOfDay(item.daypartStartMinutes ?? null),
  );
  const [endTime, setEndTime] = useState<string>(
    formatMinuteOfDay(item.daypartEndMinutes ?? null),
  );
  const [daysMask, setDaysMask] = useState<number>(
    item.daypartDaysMask ?? 127,
  );

  // Menu board config (only for type='menu_board').
  const initialConfig = (item.slideConfig as TvMenuBoardConfig | null) ?? null;
  const [mbTitle, setMbTitle] = useState(initialConfig?.title ?? item.title);
  const [mbSubtitle, setMbSubtitle] = useState(initialConfig?.subtitle ?? "");
  const [mbSourceType, setMbSourceType] = useState<
    "category" | "all_available" | "daily"
  >(initialConfig?.source.type ?? "all_available");
  const [mbCategoryId, setMbCategoryId] = useState<string>(
    initialConfig?.source.type === "category"
      ? initialConfig.source.categoryId
      : categories[0]?.id ?? "",
  );
  const [mbLayout, setMbLayout] = useState<"list" | "grid" | "grid2" | "grid3">(
    initialConfig?.layout ?? "list",
  );
  const [mbShowPrices, setMbShowPrices] = useState(initialConfig?.showPrices ?? true);
  const [mbShowDescriptions, setMbShowDescriptions] = useState(
    initialConfig?.showDescriptions ?? true,
  );
  const [mbShowImages, setMbShowImages] = useState(initialConfig?.showImages ?? false);
  const [mbCurrency, setMbCurrency] = useState<"usd" | "ves" | "both">(
    initialConfig?.currency ?? "both",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let slideConfigUpdate: TvMenuBoardConfig | null | undefined = undefined;
    if (item.type === "menu_board") {
      if (mbSourceType === "category" && !mbCategoryId) {
        toast.error("Selecciona una categoría");
        setSubmitting(false);
        return;
      }
      slideConfigUpdate = {
        kind: "menu_board",
        title: mbTitle.trim() || item.title,
        subtitle: mbSubtitle.trim() || undefined,
        source:
          mbSourceType === "category"
            ? { type: "category", categoryId: mbCategoryId }
            : mbSourceType === "daily"
              ? { type: "daily" }
              : { type: "all_available" },
        layout: mbLayout,
        showPrices: mbShowPrices,
        showDescriptions: mbShowDescriptions,
        showImages: mbShowImages,
        currency: mbCurrency,
      };
    }

    let dayStart: number | null = null;
    let dayEnd: number | null = null;
    let dayMask: number | null = null;
    if (enableDaypart) {
      dayStart = parseMinuteOfDay(startTime);
      dayEnd = parseMinuteOfDay(endTime);
      dayMask = daysMask === 127 ? null : daysMask; // 127 = every day → store NULL
    }

    const res = await updateTvMediaAction({
      id: item.id,
      title: title.trim() || undefined,
      durationSeconds,
      isActive,
      muted,
      slideConfig: slideConfigUpdate,
      daypartStartMinutes: dayStart,
      daypartEndMinutes: dayEnd,
      daypartDaysMask: dayMask,
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success("Medio actualizado");
      await onSaved();
    } else {
      toast.error("Error al guardar");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item.type === "menu_board" ? "Editar pantalla de menú" : "Editar medio"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="m-title">Título</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="m-dur">
              Duración en segundos{" "}
              {item.type === "video" && "(informativo, los videos avanzan al terminar)"}
            </Label>
            <Input
              id="m-dur"
              type="number"
              min={1}
              max={600}
              value={durationSeconds}
              onChange={(e) =>
                setDurationSeconds(
                  Math.max(1, Math.min(600, Number(e.target.value) || 10)),
                )
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Activo (incluir en el carrusel)</span>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="shrink-0"
            />
          </div>
          {item.type === "video" && (
            <div className="flex items-start justify-between gap-3 text-sm">
              <span>
                Reproducir con audio
                <span className="block text-xs text-text-muted">
                  Solo se oirá si la TV asignada tiene &quot;Audio habilitado&quot;.
                </span>
              </span>
              <Switch
                checked={!muted}
                onCheckedChange={(c) => setMuted(!c)}
                className="mt-0.5 shrink-0"
              />
            </div>
          )}

          {/* Menu board config */}
          {item.type === "menu_board" && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-semibold text-text-main">
                Contenido del menú
              </p>
              <MenuBoardConfigForm
                categories={categories}
                title={mbTitle}
                setTitle={setMbTitle}
                subtitle={mbSubtitle}
                setSubtitle={setMbSubtitle}
                sourceType={mbSourceType}
                setSourceType={setMbSourceType}
                categoryId={mbCategoryId}
                setCategoryId={setMbCategoryId}
                layout={mbLayout}
                setLayout={setMbLayout}
                showPrices={mbShowPrices}
                setShowPrices={setMbShowPrices}
                showDescriptions={mbShowDescriptions}
                setShowDescriptions={setMbShowDescriptions}
                showImages={mbShowImages}
                setShowImages={setMbShowImages}
                currency={mbCurrency}
                setCurrency={setMbCurrency}
              />
            </div>
          )}

          {/* Dayparting */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Programar por horario (Dayparting)
                </span>
                <span className="text-xs text-text-muted block mt-0.5">
                  Solo reproducir este medio en ciertas horas o días.
                  Hora de Caracas (UTC-04:00).
                </span>
              </span>
              <Switch
                checked={enableDaypart}
                onCheckedChange={setEnableDaypart}
                className="mt-0.5 shrink-0"
              />
            </div>
            {enableDaypart && (
              <DaypartingFields
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                daysMask={daysMask}
                setDaysMask={setDaysMask}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
