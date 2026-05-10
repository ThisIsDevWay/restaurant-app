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
} from "@/actions/tv";
import type { TvMedia } from "@/db/schema/tv";

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

type Props = {
  initialMedia: TvMedia[];
  initialEventMedia: EventMediaItem[];
};

export function MediaClient({ initialMedia, initialEventMedia }: Props) {
  const [media, setMedia] = useState<TvMedia[]>(initialMedia);
  const [eventMedia, setEventMedia] = useState<EventMediaItem[]>(initialEventMedia);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [editing, setEditing] = useState<TvMedia | null>(null);
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
        <div>
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
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
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
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative rounded-xl overflow-hidden bg-black ring-1 ring-border aspect-square cursor-move"
    >
      {item.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.publicUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <>
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={item.publicUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          )}
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

/* ───────────────────────── Edit Media Dialog ───────────────────────── */

function EditMediaDialog({
  item,
  onClose,
  onSaved,
}: {
  item: TvMedia;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [durationSeconds, setDurationSeconds] = useState(item.durationSeconds);
  const [isActive, setIsActive] = useState(item.isActive);
  const [muted, setMuted] = useState(item.muted);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await updateTvMediaAction({
      id: item.id,
      title: title.trim() || undefined,
      durationSeconds,
      isActive,
      muted,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar medio</DialogTitle>
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
              Duración en segundos {item.type === "video" && "(informativo, los videos avanzan al terminar)"}
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
