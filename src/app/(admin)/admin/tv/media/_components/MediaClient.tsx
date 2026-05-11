"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Video,
  Volume2,
  VolumeX,
  Globe,
  CalendarDays,
  UtensilsCrossed,
  Clock,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteTvMediaAction,
  reorderTvMediaAction,
  updateTvMediaAction,
  createMenuBoardAction,
} from "@/actions/tv";
import type { TvMedia, TvMenuBoardConfig } from "@/db/schema/tv";
import {
  DAY_LABELS_ES,
  formatMinuteOfDay,
  parseMinuteOfDay,
} from "@/lib/services/tv-dayparting";

const MAX_BYTES = 100 * 1024 * 1024;       // 100 MB por archivo
const MAX_VIDEO_SECONDS = 300;             // 5 min — suficiente para promos
const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

type UploadStatus = "pending" | "uploading" | "done" | "error";
type UploadItem = {
  uid: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
};

type EventMediaItem = TvMedia & {
  eventId: string;
  eventName: string;
};

export type CategoryLite = {
  id: string;
  name: string;
  sortOrder: number;
  isAvailable: boolean;
};

type Props = {
  initialMedia: TvMedia[];
  initialEventMedia: EventMediaItem[];
  categories: CategoryLite[];
};

export function MediaClient({ initialMedia, initialEventMedia, categories }: Props) {
  const [media, setMedia] = useState<TvMedia[]>(initialMedia);
  const [eventMedia, setEventMedia] = useState<EventMediaItem[]>(initialEventMedia);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [editing, setEditing] = useState<TvMedia | null>(null);
  const [menuBoardOpen, setMenuBoardOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const isUploading = queue.some((q) => q.status === "pending" || q.status === "uploading");

  const refresh = async () => {
    try {
      const resp = await fetch("/api/admin/tv/media", { cache: "no-store" });
      if (!resp.ok) return;
      const data = (await resp.json()) as { media: TvMedia[]; eventMedia: EventMediaItem[] };
      setMedia(data.media);
      setEventMedia(data.eventMedia ?? []);
    } catch {
      /* ignore */
    }
  };

  // Encola archivos y arranca el procesamiento secuencial.
  const enqueueFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const items: UploadItem[] = arr.map((file) => ({
      uid: `${Date.now()}-${Math.random()}`,
      file,
      status: "pending",
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...items]);

    // Kick off the processor if not already running.
    if (!processingRef.current) {
      // Small delay so state is flushed before we read the queue.
      setTimeout(() => processQueue(items), 50);
    }
  };

  const processQueue = async (newItems: UploadItem[]) => {
    if (processingRef.current) return;
    processingRef.current = true;

    // We process the items we received at enqueue time, plus any already
    // pending in state (handles race where two drops happen quickly).
    const toProcess = [...newItems];

    let doneCount = 0;
    let errorCount = 0;

    for (const item of toProcess) {
      // Mark as uploading.
      setQueue((prev) =>
        prev.map((q) =>
          q.uid === item.uid ? { ...q, status: "uploading" } : q,
        ),
      );

      try {
        if (item.file.size > MAX_BYTES) {
          throw new Error(
            `Excede 100 MB (${(item.file.size / 1024 / 1024).toFixed(1)} MB)`,
          );
        }

        let durationSeconds = 10;
        let width: number | null = null;
        let height: number | null = null;
        let thumbnailBlob: Blob | null = null;

        if (item.file.type.startsWith("video/")) {
          const meta = await readVideoMetadata(item.file).catch(() => null);
          if (meta) {
            if (meta.duration > MAX_VIDEO_SECONDS) {
              throw new Error(
                `Video demasiado largo (${Math.round(meta.duration)}s, máx ${MAX_VIDEO_SECONDS}s)`,
              );
            }
            durationSeconds = Math.max(1, Math.min(600, Math.round(meta.duration)));
            width = meta.width;
            height = meta.height;
            thumbnailBlob = meta.thumbnail;
          } else {
            durationSeconds = 30;
          }
        } else if (item.file.type.startsWith("image/")) {
          const meta = await readImageMetadata(item.file).catch(() => null);
          if (meta) { width = meta.width; height = meta.height; }
        }

        const title =
          item.file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Sin título";

        const form = new FormData();
        form.append("file", item.file);
        form.append("title", title);
        form.append("durationSeconds", String(durationSeconds));
        if (width) form.append("width", String(width));
        if (height) form.append("height", String(height));
        if (thumbnailBlob) form.append("thumbnail", thumbnailBlob, "thumb.jpg");

        await uploadWithProgress("/api/admin/tv/media", form, (pct) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.uid === item.uid ? { ...q, progress: pct } : q,
            ),
          );
        });

        setQueue((prev) =>
          prev.map((q) =>
            q.uid === item.uid ? { ...q, status: "done", progress: 100 } : q,
          ),
        );
        doneCount++;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Error";
        setQueue((prev) =>
          prev.map((q) =>
            q.uid === item.uid ? { ...q, status: "error", error } : q,
          ),
        );
        errorCount++;
      }
    }

    processingRef.current = false;

    // Refresh the grid and show summary toast.
    await refresh();
    if (doneCount > 0 && errorCount === 0) {
      toast.success(
        doneCount === 1
          ? "Archivo subido correctamente"
          : `${doneCount} archivos subidos correctamente`,
      );
    } else if (doneCount > 0 && errorCount > 0) {
      toast.warning(`${doneCount} subidos, ${errorCount} con error`);
    } else if (errorCount > 0) {
      toast.error(`${errorCount} archivos fallaron`);
    }

    // Clear the queue after a short delay so user can see the final states.
    setTimeout(() => {
      setQueue([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 2500);
  };

  const handleDelete = async (item: TvMedia | EventMediaItem) => {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    const res = await deleteTvMediaAction({ id: item.id });
    if (res?.data?.success) {
      toast.success("Medio eliminado");
      await refresh();
    } else {
      toast.error("Error al eliminar");
    }
  };

  const handleDragStart = (id: string) => {
    dragIdRef.current = id;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    const sourceIdx = media.findIndex((m) => m.id === sourceId);
    const targetIdx = media.findIndex((m) => m.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const next = [...media];
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, moved);
    setMedia(next);

    const res = await reorderTvMediaAction({
      orderedIds: next.map((m) => m.id),
    });
    if (!res?.data?.success) {
      toast.error("Error al reordenar");
      await refresh();
    }
  };

  // Page-level drag & drop handlers (for files dragged from the OS).
  const handlePageDragOver = (e: React.DragEvent) => {
    // Only activate if dragging files (not a media card reorder).
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDropActive(true);
    }
  };
  const handlePageDragLeave = (e: React.DragEvent) => {
    // Only deactivate when leaving the page entirely.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropActive(false);
    }
  };
  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="space-y-6"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Drop overlay */}
      {dropActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 border-4 border-dashed border-primary pointer-events-none">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-xl font-semibold text-primary">Suelta los archivos aquí</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Biblioteca de medios</h1>
          <p className="text-sm text-text-muted">
            Gestiona todos los archivos multimedia del sistema.
            Arrastra archivos aquí o usa el botón para subir varios a la vez.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) enqueueFiles(e.target.files);
            }}
          />
          <Button
            variant="outline"
            size="lg"
            onClick={() => setMenuBoardOpen(true)}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Crear pantalla de menú
          </Button>
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Subiendo…" : "Subir a biblioteca"}
          </Button>
        </div>
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-surface p-4 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            Cola de subida — {queue.filter((q) => q.status === "done").length}/{queue.length} completados
          </p>
          {queue.map((item) => (
            <div key={item.uid} className="flex items-center gap-3 text-sm">
              <span className="text-base leading-none">
                {item.status === "done" && "✅"}
                {item.status === "error" && "❌"}
                {item.status === "uploading" && "⏫"}
                {item.status === "pending" && "⏳"}
              </span>
              <span className="flex-1 truncate text-text-main">
                {item.file.name}
              </span>
              <span className="text-xs text-text-muted shrink-0">
                {(item.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {item.status === "uploading" && (
                <div className="w-24 h-1.5 bg-bg-app rounded overflow-hidden shrink-0">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "error" && (
                <span className="text-xs text-error shrink-0 max-w-[120px] truncate" title={item.error}>
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Sección 1: Biblioteca general ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-main leading-none">
              Biblioteca general
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Aparecen en el carrusel por defecto de todas las TVs. Arrastra para reordenar.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0">
            {media.length} {media.length === 1 ? "medio" : "medios"}
          </Badge>
        </div>

        {media.length === 0 ? (
          <Card className="ring-1 ring-border border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 mb-4">
                <Upload className="h-6 w-6 text-info" />
              </div>
              <h3 className="text-sm font-semibold text-text-main mb-1">
                Sin medios en biblioteca general
              </h3>
              <p className="text-xs text-text-muted max-w-xs mx-auto mb-4">
                Sube imágenes (JPG, PNG, WebP, GIF) o videos (MP4, WebM) hasta 100 MB cada uno.
              </p>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                Subir archivos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="ring-1 ring-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item)}
                    onEdit={() => setEditing(item)}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(item.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Sección 2: Medios de eventos ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/10">
            <CalendarDays className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-main leading-none">
              Medios de eventos
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Subidos directamente en un evento. Solo visibles dentro de ese evento.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0">
            {eventMedia.length} {eventMedia.length === 1 ? "medio" : "medios"}
          </Badge>
        </div>

        {eventMedia.length === 0 ? (
          <Card className="ring-1 ring-border border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-xs text-text-muted">
                Aún no hay medios subidos específicamente para eventos.
                Se crean desde la pantalla de detalle de cada evento.
              </p>
            </CardContent>
          </Card>
        ) : (
          (() => {
            // Group by event
            const byEvent = new Map<string, { eventName: string; items: EventMediaItem[] }>();
            for (const item of eventMedia) {
              const group = byEvent.get(item.eventId) ?? { eventName: item.eventName, items: [] };
              group.items.push(item);
              byEvent.set(item.eventId, group);
            }
            return (
              <div className="space-y-4">
                {Array.from(byEvent.entries()).map(([eventId, group]) => (
                  <Card key={eventId} className="ring-1 ring-border ring-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        {group.eventName}
                        <span className="ml-auto text-xs font-normal text-text-muted">
                          {group.items.length} {group.items.length === 1 ? "archivo" : "archivos"}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {group.items.map((item) => (
                          <MediaCard
                            key={item.id}
                            item={item}
                            onDelete={() => handleDelete(item)}
                            onEdit={() => setEditing(item)}
                            onDragStart={() => {}}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {}}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {editing && (
        <EditMediaDialog
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {menuBoardOpen && (
        <MenuBoardDialog
          categories={categories}
          onClose={() => setMenuBoardOpen(false)}
          onSaved={async () => {
            setMenuBoardOpen(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Media Card ───────────────────────── */

function MediaCard({
  item,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: TvMedia;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const hasDaypart =
    item.daypartStartMinutes != null ||
    item.daypartEndMinutes != null ||
    item.daypartDaysMask != null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative rounded-xl overflow-hidden bg-black ring-1 ring-border aspect-square cursor-move"
    >
      {item.type === "menu_board" ? (
        <MenuBoardPreview item={item} />
      ) : item.type === "image" && item.publicUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.publicUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      ) : item.type === "video" ? (
        <>
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : item.publicUrl ? (
            <video
              src={item.publicUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : null}
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            <Video className="h-3 w-3" />
            VIDEO
          </div>
          <div
            className={`absolute top-2 left-16 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
              item.muted
                ? "bg-black/70 text-white/70"
                : "bg-success/80 text-white"
            }`}
            title={item.muted ? "Sin audio" : "Con audio"}
          >
            {item.muted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </div>
        </>
      ) : null}

      {hasDaypart && (
        <div
          className="absolute top-2 right-10 inline-flex items-center gap-1 bg-amber-500/90 text-black text-[10px] font-semibold px-1.5 py-0.5 rounded"
          title="Programación por horario activa"
        >
          <Clock className="h-3 w-3" />
          HORARIO
        </div>
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-white/80 drop-shadow" />
      </div>

      {!item.isActive && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Badge variant="destructive">Inactivo</Badge>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5">
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <p className="text-[10px] opacity-70">
              {item.durationSeconds}s
              {item.width && item.height
                ? ` · ${item.width}×${item.height}`
                : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Editar"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-error/80 hover:text-error hover:bg-white/10 transition"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Menu Board Preview (grid card) ───────────────────────── */

function MenuBoardPreview({ item }: { item: TvMedia }) {
  const config = (item.slideConfig as TvMenuBoardConfig | null) ?? null;
  const sourceLabel =
    config?.source.type === "category"
      ? "Categoría"
      : config?.source.type === "daily"
        ? "Menú del día"
        : "Todo el menú";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 via-amber-700/30 to-black p-4 text-center">
      <UtensilsCrossed className="h-10 w-10 text-amber-300 mb-3" />
      <p className="text-xs font-bold text-amber-100 uppercase tracking-widest mb-1">
        Pantalla de menú
      </p>
      <p className="text-sm font-semibold text-white line-clamp-2 mb-1">
        {config?.title ?? item.title}
      </p>
      <p className="text-[10px] text-amber-200/80">{sourceLabel}</p>
      <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
        <UtensilsCrossed className="h-3 w-3" />
        MENÚ
      </div>
    </div>
  );
}

/* ───────────────────────── Edit Media Dialog ───────────────────────── */

function EditMediaDialog({
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
  const [mbLayout, setMbLayout] = useState<"list" | "grid">(
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Activo (incluir en el carrusel)
          </label>
          {item.type === "video" && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!muted}
                onChange={(e) => setMuted(!e.target.checked)}
                className="h-4 w-4 mt-0.5"
              />
              <span>
                Reproducir con audio
                <br />
                <span className="text-xs text-text-muted">
                  Solo se oirá si la TV asignada tiene &quot;Audio habilitado&quot;.
                </span>
              </span>
            </label>
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
                  Programar por horario (Dayparting)
                </span>
                <span className="text-xs text-text-muted block mt-0.5">
                  Solo reproducir este medio en ciertas horas o días.
                  Hora de Caracas (UTC-04:00).
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
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Menu Board Dialog (create) ───────────────────────── */

function MenuBoardDialog({
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

/* ───────────── Shared sub-form: Menu Board config ───────────── */

function MenuBoardConfigForm({
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
                  : "border-border bg-bg-surface text-text-muted hover:border-primary/40"
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
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm"
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
                  : "border-border bg-bg-surface text-text-muted hover:border-primary/40"
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
                  : "border-border bg-bg-surface text-text-muted hover:border-primary/40"
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

/* ───────────── Shared sub-form: Dayparting time window ───────────── */

function DaypartingFields({
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
                    : "border-border bg-bg-surface text-text-muted"
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

/* ───────────────────────── Helpers ───────────────────────── */

function readVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: Blob | null;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Try to capture first frame as thumbnail.
      let thumbnail: Blob | null = null;
      try {
        await new Promise<void>((res) => {
          video.currentTime = Math.min(0.1, video.duration / 2);
          video.onseeked = () => res();
          window.setTimeout(() => res(), 1500);
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(640, width);
        canvas.height = Math.min(640, height) * (canvas.width / width);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnail = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
          );
        }
      } catch {
        thumbnail = null;
      }

      URL.revokeObjectURL(url);
      resolve({ duration, width, height, thumbnail });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video read error"));
    };
  });
}

function readImageMetadata(file: File): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image read error"));
    };
    img.src = url;
  });
}

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (pct: number) => void,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(true);
      else {
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(body.error ?? `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}
