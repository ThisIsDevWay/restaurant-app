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
  Settings,
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
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/confirm-dialog";
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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB por imagen
const MAX_BYTES = 100 * 1024 * 1024;       // 100 MB por video
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
        const isImage = item.file.type.startsWith("image/");
        const fileMaxBytes = isImage ? MAX_IMAGE_BYTES : MAX_BYTES;
        if (item.file.size > fileMaxBytes) {
          throw new Error(
            `Excede ${isImage ? "10" : "100"} MB (${(item.file.size / 1024 / 1024).toFixed(1)} MB)`,
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

  const { confirm, confirmDialog } = useConfirm();

  const handleDelete = async (item: TvMedia | EventMediaItem) => {
    const ok = await confirm({
      title: "Eliminar medio",
      description: `¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
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
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragIdRef.current && dragIdRef.current !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (id: string) => {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = async (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
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
      className="space-y-8 pb-12"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Drop overlay */}
      {dropActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/8 backdrop-blur-md border-4 border-dashed border-primary pointer-events-none transition-all duration-300">
          <div className="text-center p-8 bg-surface-section/90 backdrop-blur-xl rounded-3xl border border-primary/30 shadow-2xl">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-2xl font-bold text-primary mb-1">¡Suelta los archivos aquí!</p>
            <p className="text-xs text-text-muted">Imágenes y videos se añadirán a la cola de subida</p>
          </div>
        </div>
      )}

      {confirmDialog}

      {/* Upload limits info */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mr-1">Formatos aceptados</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 text-[11px] font-semibold text-blue-600">
          <ImageIcon className="h-3 w-3" />
          JPG · PNG · WebP · GIF
          <span className="text-blue-400 font-normal">· máx 10 MB</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/8 border border-purple-500/20 text-[11px] font-semibold text-purple-600">
          <Video className="h-3 w-3" />
          MP4 · WebM
          <span className="text-purple-400 font-normal">· máx 5 min · 100 MB</span>
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap bg-gradient-to-br from-surface-section/80 to-surface-section/30 p-6 md:p-8 rounded-3xl border border-border/80 shadow-md backdrop-blur-md">
        <div className="space-y-1.5 flex-1 min-w-[280px]">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-main font-display">
            Biblioteca de medios
          </h1>
          <p className="text-xs md:text-sm text-text-muted max-w-xl leading-relaxed">
            Gestiona todos los archivos multimedia del sistema de TV.
            Arrastra archivos a la pantalla o utiliza los controles para subir o diseñar pantallas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            className="hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30 transition-all font-semibold rounded-2xl h-12 shadow-sm border-border/80"
          >
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Crear pantalla de menú
          </Button>
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl h-12 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01]"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Subiendo…" : "Subir a biblioteca"}
          </Button>
        </div>
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3 backdrop-blur-md">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
            Cola de subida — {queue.filter((q) => q.status === "done").length}/{queue.length} completados
          </p>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div key={item.uid} className="flex items-center gap-3 text-xs bg-surface-section/60 p-2.5 rounded-xl border border-border/40">
                <span className="text-sm shrink-0 leading-none">
                  {item.status === "done" && "✅"}
                  {item.status === "error" && "❌"}
                  {item.status === "uploading" && "⏫"}
                  {item.status === "pending" && "⏳"}
                </span>
                <span className="flex-1 truncate font-medium text-text-main">
                  {item.file.name}
                </span>
                <span className="text-[10px] text-text-muted shrink-0 font-mono">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                {item.status === "uploading" && (
                  <div className="w-28 h-2 bg-border rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "error" && (
                  <span className="text-[10px] text-error shrink-0 max-w-[120px] truncate font-medium" title={item.error}>
                    {item.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sección 1: Biblioteca general ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 shadow-sm shadow-primary/5">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main leading-none">
              Biblioteca general
            </h2>
            <p className="text-xs text-text-muted mt-1 select-none">
              Aparecen en el carrusel por defecto de todas las TVs. Arrastra los elementos para reordenar la secuencia.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 bg-primary/5 border border-primary/10 text-primary font-bold px-3 py-0.5 rounded-full text-xs">
            {media.length} {media.length === 1 ? "medio" : "medios"}
          </Badge>
        </div>

        {media.length === 0 ? (
          <Card className="ring-1 ring-border border-dashed rounded-3xl bg-surface-section/20 overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 border border-info/20 mb-4 shadow-sm">
                <Upload className="h-6 w-6 text-info animate-bounce-subtle" />
              </div>
              <h3 className="text-sm font-bold text-text-main mb-1">
                Sin medios en biblioteca general
              </h3>
              <p className="text-xs text-text-muted max-w-xs mx-auto mb-5 leading-normal">
                Sube imágenes (JPG, PNG, WebP, GIF) o videos (MP4, WebM) hasta 100 MB cada uno.
              </p>
              <Button 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90 text-white font-medium rounded-xl px-4 py-2 transition-all shadow-sm"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Subir archivos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border/80 shadow-sm rounded-3xl bg-surface-section/20 overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {media.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item)}
                    onEdit={() => setEditing(item)}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, item.id)}
                    onDragLeave={() => handleDragLeave(item.id)}
                    onDrop={() => handleDrop(item.id)}
                    draggedId={draggedId}
                    dragOverId={dragOverId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Sección 2: Medios de eventos ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm shadow-amber-500/5">
            <CalendarDays className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main leading-none">
              Medios de eventos
            </h2>
            <p className="text-xs text-text-muted mt-1 select-none">
              Subidos directamente en un evento. Solo visibles en las programaciones activas del respectivo evento.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-3 py-0.5 rounded-full text-xs">
            {eventMedia.length} {eventMedia.length === 1 ? "medio" : "medios"}
          </Badge>
        </div>

        {eventMedia.length === 0 ? (
          <Card className="border border-border/60 border-dashed rounded-3xl bg-surface-section/10">
            <CardContent className="py-12 text-center">
              <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto select-none">
                Aún no hay medios subidos específicamente para eventos.
                Se crean automáticamente desde la pantalla de detalle de cada evento.
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
              <div className="space-y-6">
                {Array.from(byEvent.entries()).map(([eventId, group]) => (
                  <Card key={eventId} className="border border-amber-500/15 rounded-3xl bg-amber-500/[0.01] shadow-sm overflow-hidden">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-amber-500/10 bg-amber-500/[0.02]">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <CalendarDays className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                        {group.eventName}
                        <span className="ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                          {group.items.length} {group.items.length === 1 ? "archivo" : "archivos"}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6">
                      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
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

/* ───────────────────────── Helpers ───────────────────────── */

const cleanTitle = (rawTitle: string) => {
  if (!rawTitle) return "";
  const title = rawTitle.replace(/\.[^.]+$/, ""); // Remove extension
  // If it's a long hash/filename with no spaces, truncate elegantly in the middle
  if (title.length > 22 && !title.includes(" ")) {
    return `${title.slice(0, 10)}...${title.slice(-6)}`;
  }
  return title;
};

/**
 * Returns the simplified aspect ratio label ("16:9", "9:16", "4:3", etc.)
 * and an inline style object to drive the card dimensions.
 */
function getAspectRatio(width: number | null, height: number | null): {
  style: React.CSSProperties;
  label: string;
} {
  if (!width || !height || width <= 0 || height <= 0) {
    // Fallback: landscape 16:9
    return { style: { aspectRatio: "16/9" }, label: "16:9" };
  }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  const rw = width / d;
  const rh = height / d;
  // Snap common ratios
  const ratio = width / height;
  let label: string;
  if (Math.abs(ratio - 16 / 9) < 0.05) label = "16:9";
  else if (Math.abs(ratio - 9 / 16) < 0.05) label = "9:16";
  else if (Math.abs(ratio - 4 / 3) < 0.05) label = "4:3";
  else if (Math.abs(ratio - 3 / 4) < 0.05) label = "3:4";
  else if (Math.abs(ratio - 1) < 0.05) label = "1:1";
  else if (Math.abs(ratio - 21 / 9) < 0.05) label = "21:9";
  else label = `${rw}:${rh}`;
  return { style: { aspectRatio: `${width}/${height}` }, label };
}

/* ───────────────────────── Media Card ───────────────────────── */

function MediaCard({
  item,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  draggedId,
  dragOverId,
}: {
  item: TvMedia;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd?: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop: () => void;
  draggedId?: string | null;
  dragOverId?: string | null;
}) {
  const hasDaypart =
    item.daypartStartMinutes != null ||
    item.daypartEndMinutes != null ||
    item.daypartDaysMask != null;

  const displayTitle = cleanTitle(item.title);
  const { style: aspectStyle, label: ratioLabel } = getAspectRatio(item.width, item.height);

  // For menu boards, use a fixed 9:16 preview aspect ratio
  const cardStyle = item.type === "menu_board" ? { aspectRatio: "9/16" } : aspectStyle;
  const displayRatioLabel = item.type === "menu_board" ? "9:16" : ratioLabel;

  const isDraggingThis = draggedId === item.id;
  const isDragOverThis = dragOverId === item.id;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={cardStyle}
      className={`group relative rounded-2xl overflow-hidden bg-surface-section border transition-all duration-300 ease-out ${
        isDraggingThis
          ? "opacity-25 border-dashed border-2 border-primary/50 scale-95 cursor-grabbing ring-2 ring-primary/10"
          : isDragOverThis
            ? "border-primary ring-2 ring-primary/45 bg-primary/[0.02] scale-[1.03] shadow-2xl shadow-primary/15"
            : !item.isActive
              ? "opacity-60 grayscale-[30%] border-destructive/30 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/5 hover:-translate-y-1 cursor-grab active:cursor-grabbing"
              : "border-border/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/45 hover:ring-2 hover:ring-primary/20 cursor-grab active:cursor-grabbing"
      }`}
    >
      {/* Background Media */}
      <div className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-105">
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
          </>
        ) : null}
      </div>

      {/* Top-left badge row */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1 pointer-events-none">
        {item.type === "video" && (
          <>
            <div className="backdrop-blur-md bg-surface-section/70 border border-border/50 text-text-main text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Video className="h-2.5 w-2.5 text-primary" />
              VIDEO
            </div>
            <div className="backdrop-blur-md bg-surface-section/70 border border-border/50 text-text-muted text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center justify-center">
              {item.muted ? (
                <VolumeX className="h-2.5 w-2.5 text-text-muted" />
              ) : (
                <Volume2 className="h-2.5 w-2.5 text-success" />
              )}
            </div>
          </>
        )}
        {item.type === "image" && (
          <div className="backdrop-blur-md bg-surface-section/70 border border-border/50 text-text-main text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <ImageIcon className="h-2.5 w-2.5 text-info" />
            IMAGEN
          </div>
        )}
        {item.type === "menu_board" && (
          <div className="backdrop-blur-md bg-amber-500/20 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <UtensilsCrossed className="h-2.5 w-2.5" />
            MENÚ
          </div>
        )}
      </div>

      {/* Top-right: aspect ratio + daypart + drag handle */}
      <div className="absolute top-2 right-2 z-20 flex gap-1 pointer-events-none">
        {/* Aspect ratio pill — always shown */}
        <div
          className={`backdrop-blur-md border text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm ${
            item.type === "menu_board"
              ? "bg-black/60 border-white/10 text-white/80"
              : "bg-surface-section/70 border-border/50 text-text-muted"
          }`}
        >
          {displayRatioLabel}
        </div>
        {hasDaypart && (
          <div
            className="backdrop-blur-md bg-amber-500/20 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1"
            title="Programación por horario activa"
          >
            <Clock className="h-2.5 w-2.5" />
            HORARIO
          </div>
        )}
        {/* Drag handle — visible on hover */}
        <div
          className={`opacity-0 group-hover:opacity-100 pointer-events-auto transition-opacity duration-200 backdrop-blur-md border p-1 rounded-full shadow-sm ${
            item.type === "menu_board"
              ? "bg-black/60 border-white/10 text-white/70"
              : "bg-surface-section/70 border-border/50 text-text-muted"
          }`}
        >
          <GripVertical className="h-3 w-3" />
        </div>
      </div>

      {/* Inactive overlay */}
      {!item.isActive && (
        <div
          className={`absolute inset-0 z-10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none ${
            item.type === "menu_board" ? "bg-black/65" : "bg-surface-section/70"
          }`}
        >
          <Badge
            variant="destructive"
            className="px-3 py-1 font-semibold tracking-wide rounded-full text-xs shadow-lg"
          >
            Inactivo
          </Badge>
        </div>
      )}

      {/* Bottom info bar — dynamic styling to ensure perfect dark/light contrast */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 pt-10 px-3 pb-2.5 bg-gradient-to-t ${
          item.type === "menu_board"
            ? "from-black/90 via-black/55 to-transparent"
            : "from-surface-section/95 via-surface-section/70 to-transparent"
        }`}
      >
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className={`text-xs font-semibold truncate select-none leading-tight ${
                item.type === "menu_board" ? "text-white" : "text-text-main"
              }`}
              title={item.title}
            >
              {displayTitle}
            </h3>
            <p
              className={`text-[10px] mt-0.5 font-medium flex items-center gap-1 select-none ${
                item.type === "menu_board" ? "text-amber-200/60" : "text-text-muted"
              }`}
            >
              <span>{item.durationSeconds}s</span>
              {(item.width && item.height) || item.type === "menu_board" ? (
                <>
                  <span className="opacity-40">·</span>
                  <span className="font-mono">
                    {item.type === "menu_board"
                      ? "1080×1920"
                      : `${item.width}×${item.height}`}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 shrink-0 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={`group/btn p-2 rounded-lg backdrop-blur-md border hover:scale-105 active:scale-95 transition-all shadow-sm ${
                item.type === "menu_board"
                  ? "bg-black/60 border-white/30 hover:bg-amber-500 hover:border-amber-400 text-white"
                  : "bg-surface-section/90 border-border/80 hover:bg-primary/20 hover:border-primary text-text-main"
              }`}
              title="Editar detalles y horarios"
            >
              <Settings
                className={`h-4 w-4 transition-colors ${
                  item.type === "menu_board"
                    ? "text-amber-200 group-hover/btn:text-white"
                    : "text-text-muted group-hover/btn:text-primary"
                }`}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`group/btn p-2 rounded-lg backdrop-blur-md border hover:scale-105 active:scale-95 transition-all shadow-sm ${
                item.type === "menu_board"
                  ? "bg-black/60 border-white/30 hover:bg-red-600 hover:border-red-500 text-white"
                  : "bg-surface-section/90 border-border/80 hover:bg-error/15 hover:border-error/50 text-error"
              }`}
              title="Eliminar de la biblioteca"
            >
              <Trash2
                className={`h-4 w-4 transition-colors ${
                  item.type === "menu_board"
                    ? "text-red-400 group-hover/btn:text-white"
                    : "text-error"
                }`}
              />
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2c1805] via-[#160d05] to-[#040201] p-4 pb-12 text-center select-none">
      <UtensilsCrossed className="h-10 w-10 text-amber-500 mb-3 animate-pulse" />
      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">
        Pantalla de menú
      </p>
      <p className="text-sm font-semibold text-white line-clamp-2 mb-1">
        {config?.title ?? item.title}
      </p>
      <p className="text-[10px] text-amber-300/80 font-medium">{sourceLabel}</p>
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
