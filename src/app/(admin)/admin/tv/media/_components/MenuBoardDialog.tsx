"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Clock, UtensilsCrossed, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMenuBoardAction } from "@/actions/tv";
import type { TvMenuBoardConfig } from "@/db/schema/tv";
import { parseMinuteOfDay } from "@/lib/services/tv-dayparting";
import type { CategoryLite } from "./MediaClient";
import { DaypartingFields } from "./EditMediaDialog";

/* ───────────── Shared sub-form: Menu Board config ───────────── */

export function MenuBoardConfigForm({
  categories,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  sourceType,
  setSourceType,
  categoryId,
  setCategoryId,
  layout,
  setLayout,
  showPrices,
  setShowPrices,
  showDescriptions,
  setShowDescriptions,
  showImages,
  setShowImages,
  currency,
  setCurrency,
}: {
  categories: CategoryLite[];
  title: string;
  setTitle: (s: string) => void;
  subtitle: string;
  setSubtitle: (s: string) => void;
  sourceType: "category" | "all_available" | "daily";
  setSourceType: (s: "category" | "all_available" | "daily") => void;
  categoryId: string;
  setCategoryId: (s: string) => void;
  layout: "list" | "grid";
  setLayout: (s: "list" | "grid") => void;
  showPrices: boolean;
  setShowPrices: (b: boolean) => void;
  showDescriptions: boolean;
  setShowDescriptions: (b: boolean) => void;
  showImages: boolean;
  setShowImages: (b: boolean) => void;
  currency: "usd" | "ves" | "both";
  setCurrency: (s: "usd" | "ves" | "both") => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="mb-title">Título mostrado en la TV</Label>
        <Input
          id="mb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ej: Nuestro menú del día"
        />
      </div>
      <div>
        <Label htmlFor="mb-subtitle">Subtítulo (opcional)</Label>
        <Input
          id="mb-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={200}
          placeholder="Ej: Sirviendo desde 1995"
        />
      </div>

      <div>
        <Label>¿Qué productos mostrar?</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {(
            [
              { value: "daily", label: "Menú del día" },
              { value: "category", label: "Una categoría" },
              { value: "all_available", label: "Todo el menú" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSourceType(opt.value)}
              className={`text-xs rounded-md border px-2 py-2 transition ${
                sourceType === opt.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface-section text-text-muted hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sourceType === "category" && (
        <div>
          <Label htmlFor="mb-cat">Categoría</Label>
          <select
            id="mb-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-section px-3 py-2 text-sm"
          >
            {categories.length === 0 && <option value="">(sin categorías)</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label>Diseño</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {(
            [
              { value: "list", label: "Lista (vertical)" },
              { value: "grid", label: "Cuadrícula" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLayout(opt.value)}
              className={`text-xs rounded-md border px-2 py-2 transition ${
                layout === opt.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface-section text-text-muted hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Moneda mostrada</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {(
            [
              { value: "usd", label: "USD" },
              { value: "ves", label: "Bs" },
              { value: "both", label: "Ambas" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCurrency(opt.value)}
              className={`text-xs rounded-md border px-2 py-2 transition ${
                currency === opt.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface-section text-text-muted hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showPrices}
            onChange={(e) => setShowPrices(e.target.checked)}
            className="h-4 w-4"
          />
          Mostrar precios
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showDescriptions}
            onChange={(e) => setShowDescriptions(e.target.checked)}
            className="h-4 w-4"
          />
          Mostrar descripciones
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showImages}
            onChange={(e) => setShowImages(e.target.checked)}
            className="h-4 w-4"
          />
          Mostrar imágenes (si el producto tiene)
        </label>
      </div>
    </div>
  );
}

/* ───────────────────────── Menu Board Dialog (create) ───────────────────────── */

export function MenuBoardDialog({
  categories,
  onClose,
  onSaved,
}: {
  categories: CategoryLite[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [adminTitle, setAdminTitle] = useState("Pantalla de menú");
  const [duration, setDuration] = useState(15);
  const [title, setTitle] = useState("Nuestro menú");
  const [subtitle, setSubtitle] = useState("");
  const [sourceType, setSourceType] = useState<
    "category" | "all_available" | "daily"
  >("daily");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showImages, setShowImages] = useState(false);
  const [currency, setCurrency] = useState<"usd" | "ves" | "both">("both");

  const [enableDaypart, setEnableDaypart] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysMask, setDaysMask] = useState(127);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === "category" && !categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    if (!title.trim()) {
      toast.error("Indica el título que se mostrará en pantalla");
      return;
    }
    setSubmitting(true);

    let dayStart: number | null = null;
    let dayEnd: number | null = null;
    let dayMaskValue: number | null = null;
    if (enableDaypart) {
      dayStart = parseMinuteOfDay(startTime);
      dayEnd = parseMinuteOfDay(endTime);
      dayMaskValue = daysMask === 127 ? null : daysMask;
    }

    const res = await createMenuBoardAction({
      title: adminTitle.trim() || title.trim(),
      durationSeconds: Math.max(3, Math.min(600, duration)),
      config: {
        kind: "menu_board",
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        source:
          sourceType === "category"
            ? { type: "category", categoryId }
            : sourceType === "daily"
              ? { type: "daily" }
              : { type: "all_available" },
        layout,
        showPrices,
        showDescriptions,
        showImages,
        currency,
      },
      daypartStartMinutes: dayStart,
      daypartEndMinutes: dayEnd,
      daypartDaysMask: dayMaskValue,
    });
    setSubmitting(false);

    if (res?.data?.success) {
      toast.success("Pantalla de menú creada");
      await onSaved();
    } else {
      toast.error(res?.data?.error ?? "Error al crear");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-500" />
            Crear pantalla de menú en vivo
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-text-main">
            <strong>¿Qué es esto?</strong> Una diapositiva que muestra el menú
            real del restaurante leído en vivo de la base de datos. Los precios
            y la disponibilidad se actualizan automáticamente cada vez que la
            TV consulta el servidor.
          </div>

          <div>
            <Label htmlFor="mb-admin-title">Nombre interno (admin)</Label>
            <Input
              id="mb-admin-title"
              value={adminTitle}
              onChange={(e) => setAdminTitle(e.target.value)}
              maxLength={200}
              placeholder="Ej: Menú del día - Almuerzo"
            />
            <p className="mt-1 text-xs text-text-muted">
              Solo se muestra en este panel. El título de la TV es el de abajo.
            </p>
          </div>

          <div>
            <Label htmlFor="mb-dur">Duración en pantalla (segundos)</Label>
            <Input
              id="mb-dur"
              type="number"
              min={3}
              max={600}
              value={duration}
              onChange={(e) =>
                setDuration(Math.max(3, Math.min(600, Number(e.target.value) || 15)))
              }
            />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-semibold text-text-main">
              Contenido en pantalla
            </p>
            <MenuBoardConfigForm
              categories={categories}
              title={title}
              setTitle={setTitle}
              subtitle={subtitle}
              setSubtitle={setSubtitle}
              sourceType={sourceType}
              setSourceType={setSourceType}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              layout={layout}
              setLayout={setLayout}
              showPrices={showPrices}
              setShowPrices={setShowPrices}
              showDescriptions={showDescriptions}
              setShowDescriptions={setShowDescriptions}
              showImages={showImages}
              setShowImages={setShowImages}
              currency={currency}
              setCurrency={setCurrency}
            />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={enableDaypart}
                onChange={(e) => setEnableDaypart(e.target.checked)}
                className="h-4 w-4 mt-0.5"
              />
              <span>
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Programar por horario
                </span>
                <span className="text-xs text-text-muted block mt-0.5">
                  Ideal para mostrar &quot;Menú de desayuno&quot; solo de 7–11h, etc.
                </span>
              </span>
            </label>
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
              {submitting ? "Creando…" : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear pantalla
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
