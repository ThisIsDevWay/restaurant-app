"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Globe,
  CalendarDays,
  UtensilsCrossed,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  deleteTvMediaAction,
  reorderTvMediaAction,
} from "@/actions/tv";
import type { TvMedia } from "@/db/schema/tv";
import { MediaCard } from "./MediaCard";
import { EditMediaDialog } from "./EditMediaDialog";
import { MenuBoardDialog } from "./MenuBoardDialog";
import {
  readVideoMetadata,
  readImageMetadata,
  uploadWithProgress,
} from "./media-client-utils";

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
