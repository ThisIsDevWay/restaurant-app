"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  LayoutGrid,
  List,
  ChevronDown,
} from "lucide-react";
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
import { createMenuBoardAction } from "@/actions/tv";
import type { CategoryLite } from "./EditMediaDialog";

type SourceType = "all_available" | "daily" | "category";
type Layout = "list" | "grid" | "grid2" | "grid3" | "promo";
type Currency = "usd" | "ves" | "both";

type Props = {
  categories: CategoryLite[];
  onClose: () => void;
  onSaved: () => void;
};

function minutesToTime(m: number | null | undefined): string {
  if (m == null) return "";
  const h = Math.floor(m / 60).toString().padStart(2, "0");
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

export function MenuBoardDialog({ categories, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("Menú del Día");
  const [subtitle, setSubtitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("daily");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    categories[0] ? [categories[0].id] : [],
  );
  const [onlyDaily, setOnlyDaily] = useState(false);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const [layout, setLayout] = useState<Layout>("grid2");
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [currency, setCurrency] = useState<Currency>("both");
  const [duration, setDuration] = useState("30");
  const [maxItems, setMaxItems] = useState("");
  const [sortMode, setSortMode] = useState<"custom" | "price_asc" | "price_desc">("custom");
  const [submitting, setSubmitting] = useState(false);

  // Dayparting
  const [daypartEnabled, setDaypartEnabled] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysMask, setDaysMask] = useState<number>(0b1111111);

  const toggleDay = (bit: number) =>
    setDaysMask((prev) => (prev & bit ? prev & ~bit : prev | bit));

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const dur = Number(duration);
    if (!Number.isInteger(dur) || dur < 3 || dur > 600) {
      toast.error("La duración debe estar entre 3 y 600 segundos");
      return;
    }
    if (sourceType === "category" && selectedCategoryIds.length === 0) {
      toast.error("Selecciona al menos una categoría");
      return;
    }

    setSubmitting(true);

    const source =
      sourceType === "category"
        ? { type: "category" as const, categoryIds: selectedCategoryIds, onlyDaily }
        : sourceType === "daily"
          ? { type: "daily" as const }
          : { type: "all_available" as const };

    const res = await createMenuBoardAction({
      title: title.trim(),
      durationSeconds: dur,
      config: {
        kind: "menu_board",
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        source,
        layout,
        showPrices,
        showDescriptions,
        showImages,
        currency,
        maxItems: maxItems ? Number(maxItems) : undefined,
        sortMode,
      },
      daypartStartMinutes: daypartEnabled ? timeToMinutes(startTime) : null,
      daypartEndMinutes: daypartEnabled ? timeToMinutes(endTime) : null,
      daypartDaysMask: daypartEnabled ? daysMask : null,
    });

    setSubmitting(false);

    if (res?.data?.success) {
      toast.success("Pantalla de menú creada");
      onSaved();
    } else {
      toast.error("Error al crear la pantalla");
    }
  };

  const layoutOptions: { value: Layout; label: string; icon: React.ReactNode }[] = [
    { value: "list", label: "Lista", icon: <List className="h-3.5 w-3.5" /> },
    { value: "grid2", label: "Cuadrícula 2", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { value: "grid", label: "Cuadrícula 3", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { value: "promo", label: "Plato del Día", icon: <UtensilsCrossed className="h-3.5 w-3.5" /> },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 flex flex-col gap-0 rounded-2xl border-border bg-surface-section overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2 pr-8">
            <UtensilsCrossed className="h-5 w-5 text-amber-500" />
            Crear pantalla de menú
          </DialogTitle>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Diseña una diapositiva dinámica que muestra el menú en tiempo real. Se actualiza automáticamente con cada cambio de precios o disponibilidad.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Título principal *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Menú del Día"
                maxLength={120}
                className="bg-bg-app border-border rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Subtítulo
              </Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Cocina venezolana con amor"
                maxLength={200}
                className="bg-bg-app border-border rounded-xl"
              />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Fuente de datos
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "daily", label: "Menú del día", desc: "Ítems del día activo" },
                  { value: "all_available", label: "Todo el menú", desc: "Todos los ítems disponibles" },
                  { value: "category", label: "Categoría", desc: "Filtra por categoría" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourceType(opt.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${sourceType === opt.value
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-800"
                      : "bg-bg-app border-border text-text-muted hover:border-amber-500/20 hover:text-text-main"
                    }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>

            {sourceType === "category" && (
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Categorías seleccionadas *
                  </p>
                  <div className="flex flex-wrap gap-2 p-3 bg-bg-app border border-border rounded-xl min-h-[50px]">
                    {categories.map((c) => {
                      const selected = selectedCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                              : "bg-surface-section text-text-muted border-border hover:border-amber-500/40 hover:text-text-main"
                            }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg-app px-4 py-3">
                  <div>
                    <Label className="text-xs font-semibold text-text-main">
                      Solo menú del día
                    </Label>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Muestra únicamente items de estas categorías programados para hoy
                    </p>
                  </div>
                  <Switch
                    checked={onlyDaily}
                    onCheckedChange={setOnlyDaily}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Distribución visual
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  className={`rounded-xl border p-2.5 flex flex-col items-center gap-1.5 transition-all ${layout === opt.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-bg-app border-border text-text-muted hover:border-primary/20"
                    }`}
                >
                  {opt.icon}
                  <span className="text-[10px] font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ordenamiento del Catálogo */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Ordenamiento del catálogo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "custom", label: "Personalizado", desc: "Orden manual" },
                  { value: "price_asc", label: "Precio (Asc.)", desc: "Menor a mayor" },
                  { value: "price_desc", label: "Precio (Desc.)", desc: "Mayor a menor" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortMode(opt.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${sortMode === opt.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-bg-app border-border text-text-muted hover:border-primary/20 hover:text-text-main"
                    }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { label: "Precios", value: showPrices, set: setShowPrices },
                { label: "Descripciones", value: showDescriptions, set: setShowDescriptions },
                { label: "Imágenes", value: showImages, set: setShowImages },
              ] as const
            ).map((opt) => (
              <div
                key={opt.label}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-bg-app px-3 py-2.5"
              >
                <Label className="text-[11px] font-semibold text-text-main">{opt.label}</Label>
                <Switch
                  checked={opt.value}
                  onCheckedChange={opt.set as (v: boolean) => void}
                />
              </div>
            ))}
            {/* Currency */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full appearance-none bg-bg-app border border-border/60 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="usd">Solo USD</option>
                <option value="ves">Solo Bs</option>
                <option value="both">USD + Bs</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Duration & Max items */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Duración por diapositiva (s)
              </Label>
              <Input
                type="number"
                min={3}
                max={600}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-bg-app border-border rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Máx. ítems (opcional)
              </Label>
              <Input
                type="number"
                min={1}
                max={48}
                placeholder="Sin límite"
                value={maxItems}
                onChange={(e) => setMaxItems(e.target.value)}
                className="bg-bg-app border-border rounded-xl"
              />
            </div>
          </div>

          {/* Dayparting */}
          <div className="rounded-xl border border-border/60 bg-bg-app/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div>
                <p className="text-xs font-bold text-text-main">Programación horaria</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Limita el horario de visualización de esta pantalla
                </p>
              </div>
              <Switch checked={daypartEnabled} onCheckedChange={setDaypartEnabled} />
            </div>

            {daypartEnabled && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Desde</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-bg-app border-border rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Hasta</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-bg-app border-border rounded-xl text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Días activos</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((day, i) => {
                      const bit = 1 << i;
                      const active = Boolean(daysMask & bit);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(bit)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${active
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
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/5"
          >
            <UtensilsCrossed className="h-4 w-4 mr-1.5" />
            {submitting ? "Creando…" : "Crear pantalla de menú"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
