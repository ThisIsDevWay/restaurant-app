"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Video,
  GripVertical,
  Save,
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
  updateTvEventAction,
  removeMediaFromEventAction,
  reorderEventMediaAction,
  assignEventToDisplaysAction,
} from "@/actions/tv";
import type { TvEvent, TvMedia, TvDisplay } from "@/db/schema/tv";

const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 300;

type UploadStatus = "pending" | "uploading" | "done" | "error";
type UploadItem = {
  uid: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
};

type EventMediaItem = {
  id: string;
  title: string;
  type: "image" | "video" | "menu_board";
  publicUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  displayOrder: number;
};

type Props = {
  event: TvEvent;
  eventMedia: EventMediaItem[];
  allMedia: TvMedia[];
  allDisplays: TvDisplay[];
  assignedDisplayIds: string[];
};

export function EventDetailClient({
  event,
  eventMedia,
  allMedia,
  allDisplays,
  assignedDisplayIds,
}: Props) {
  const router = useRouter();
  const [media, setMedia] = useState(eventMedia);

  // Sync state when Next.js re-renders this component after router.refresh().
  useEffect(() => {
    setMedia(eventMedia);
  }, [eventMedia]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const isUploading = queue.some(
    (q) => q.status === "pending" || q.status === "uploading",
  );

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
    if (!processingRef.current) setTimeout(() => processQueue(items), 50);
  };

  const processQueue = async (newItems: UploadItem[]) => {
    if (processingRef.current) return;
    processingRef.current = true;

    let doneCount = 0;
    let errorCount = 0;

    for (const item of newItems) {
      setQueue((prev) =>
        prev.map((q) =>
          q.uid === item.uid ? { ...q, status: "uploading" } : q,
        ),
      );

      try {
        if (item.file.size > MAX_BYTES)
          throw new Error(
            `Excede 100 MB (${(item.file.size / 1024 / 1024).toFixed(1)} MB)`,
          );

        let durationSeconds = 10;
        let width: number | null = null;
        let height: number | null = null;
        let thumbnailBlob: Blob | null = null;

        if (item.file.type.startsWith("video/")) {
          const meta = await readVideoMetadata(item.file).catch(() => null);
          if (meta) {
            if (meta.duration > MAX_VIDEO_SECONDS)
              throw new Error(
                `Video demasiado largo (${Math.round(meta.duration)}s, máx ${MAX_VIDEO_SECONDS}s)`,
              );
            durationSeconds = Math.max(
              1,
              Math.min(600, Math.round(meta.duration)),
            );
            width = meta.width;
            height = meta.height;
            thumbnailBlob = meta.thumbnail;
          } else {
            durationSeconds = 30;
          }
        } else if (item.file.type.startsWith("image/")) {
          const meta = await readImageMetadata(item.file).catch(() => null);
          if (meta) {
            width = meta.width;
            height = meta.height;
          }
        }

        const title =
          item.file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Sin título";

        const form = new FormData();
        form.append("file", item.file);
        form.append("title", title);
        form.append("durationSeconds", String(durationSeconds));
        if (width) form.append("width", String(width));
        if (height) form.append("height", String(height));
        if (thumbnailBlob)
          form.append("thumbnail", thumbnailBlob, "thumb.jpg");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/admin/tv/events/${event.id}/media`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setQueue((prev) =>
                prev.map((q) =>
                  q.uid === item.uid ? { ...q, progress: pct } : q,
                ),
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else {
              try {
                const body = JSON.parse(xhr.responseText) as {
                  error?: string;
                };
                reject(new Error(body.error ?? `HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(form);
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
    router.refresh();

    if (doneCount > 0 && errorCount === 0)
      toast.success(
        doneCount === 1
          ? "Archivo subido"
          : `${doneCount} archivos subidos`,
      );
    else if (doneCount > 0 && errorCount > 0)
      toast.warning(`${doneCount} subidos, ${errorCount} con error`);
    else if (errorCount > 0) toast.error(`${errorCount} archivos fallaron`);

    setTimeout(() => {
      setQueue([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 2500);
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!confirm("¿Quitar este medio del evento?")) return;
    const res = await removeMediaFromEventAction({
      eventId: event.id,
      mediaId,
    });
    if (res?.data?.success) {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success("Medio quitado");
    } else {
      toast.error("Error");
    }
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
    const res = await reorderEventMediaAction({
      eventId: event.id,
      orderedIds: next.map((m) => m.id),
    });
    if (!res?.data?.success) {
      toast.error("Error al reordenar");
      router.refresh();
    }
  };

  const addExisting = async (mediaIds: string[]) => {
    if (mediaIds.length === 0) return;
    const resp = await fetch(`/api/admin/tv/events/${event.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds }),
    });
    if (resp.ok) {
      toast.success("Medios agregados");
      setPickerOpen(false);
      router.refresh();
    } else {
      toast.error("Error al agregar");
    }
  };

  const handlePageDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDropActive(true);
    }
  };
  const handlePageDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node))
      setDropActive(false);
  };
  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length > 0) enqueueFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="space-y-6"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {dropActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 border-4 border-dashed border-primary pointer-events-none">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-xl font-semibold text-primary">Suelta los archivos aquí</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/tv/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Eventos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-text-main">{event.name}</h1>
        {event.isActive && (
          <Badge className="bg-success/10 text-success">Activo</Badge>
        )}
      </div>

      <EventInfoSection event={event} />

      <Card className="ring-1 ring-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Medios del evento</CardTitle>
            <div className="flex items-center gap-2">
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
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Desde biblioteca
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? "Subiendo…" : "Subir archivos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queue.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-bg-surface p-3 space-y-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                Subiendo — {queue.filter((q) => q.status === "done").length}/{queue.length}
              </p>
              {queue.map((item) => (
                <div key={item.uid} className="flex items-center gap-2 text-sm">
                  <span className="text-base leading-none">
                    {item.status === "done" && "✅"}
                    {item.status === "error" && "❌"}
                    {item.status === "uploading" && "⏫"}
                    {item.status === "pending" && "⏳"}
                  </span>
                  <span className="flex-1 truncate text-text-main">{item.file.name}</span>
                  {item.status === "uploading" && (
                    <div className="w-20 h-1.5 bg-bg-app rounded overflow-hidden shrink-0">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && (
                    <span className="text-xs text-error shrink-0 max-w-[100px] truncate" title={item.error}>
                      {item.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {media.length === 0 && queue.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">
              Aún no hay medios en este evento. Sube archivos o agrégalos desde la biblioteca.
            </p>
          ) : media.length === 0 ? null : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {media.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => {
                    dragIdRef.current = item.id;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(item.id)}
                  className="group relative rounded-xl overflow-hidden bg-black ring-1 ring-border aspect-square cursor-move"
                >
                  {item.type === "menu_board" ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/30 via-amber-700/30 to-black text-amber-100 text-[10px] font-bold uppercase tracking-widest">
                      Pantalla de menú
                    </div>
                  ) : item.type === "image" && item.publicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.publicUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : item.thumbnailUrl ? (
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
                  {item.type === "video" && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Video className="h-3 w-3" /> VIDEO
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-4 w-4 text-white drop-shadow" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white truncate flex-1">
                        {item.title}
                      </p>
                      <button
                        onClick={() => handleRemoveMedia(item.id)}
                        className="text-error/90 hover:text-error p-1"
                        title="Quitar del evento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignmentsSection
        event={event}
        allDisplays={allDisplays}
        assignedDisplayIds={assignedDisplayIds}
      />

      {pickerOpen && (
        <MediaPickerDialog
          allMedia={allMedia}
          alreadyAddedIds={media.map((m) => m.id)}
          onClose={() => setPickerOpen(false)}
          onAdd={addExisting}
        />
      )}
    </div>
  );
}

function EventInfoSection({ event }: { event: TvEvent }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(
    event.startsAt
      ? toLocalDatetimeInput(new Date(event.startsAt))
      : "",
  );
  const [endsAt, setEndsAt] = useState(
    event.endsAt ? toLocalDatetimeInput(new Date(event.endsAt)) : "",
  );
  const [appliesToAllDisplays, setAppliesToAllDisplays] = useState(
    event.appliesToAllDisplays,
  );
  const [isActive, setIsActive] = useState(event.isActive);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    const res = await updateTvEventAction({
      id: event.id,
      name: name.trim() || undefined,
      description: description.trim() || null,
      startsAt: startsAt ? new Date(startsAt + ":00-04:00").toISOString() : null,
      endsAt: endsAt ? new Date(endsAt + ":00-04:00").toISOString() : null,
      appliesToAllDisplays,
      isActive,
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success("Guardado");
      router.refresh();
    } else {
      toast.error("Error al guardar");
    }
  };

  return (
    <Card className="ring-1 ring-border">
      <CardHeader>
        <CardTitle className="text-base">Información del evento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ed-name">Nombre</Label>
          <Input
            id="ed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="ed-desc">Descripción</Label>
          <Input
            id="ed-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ed-start">Inicio</Label>
            <Input
              id="ed-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ed-end">Fin</Label>
            <Input
              id="ed-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Evento activo
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={appliesToAllDisplays}
              onChange={(e) => setAppliesToAllDisplays(e.target.checked)}
              className="h-4 w-4"
            />
            Aplicar a todas las TVs
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={submitting}>
            <Save className="h-4 w-4" />
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentsSection({
  event,
  allDisplays,
  assignedDisplayIds,
}: {
  event: TvEvent;
  allDisplays: TvDisplay[];
  assignedDisplayIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(assignedDisplayIds),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const res = await assignEventToDisplaysAction({
      eventId: event.id,
      displayIds: Array.from(selected),
    });
    setSaving(false);
    if (res?.data?.success) {
      toast.success("Asignaciones guardadas");
      router.refresh();
    } else {
      toast.error("Error al guardar");
    }
  };

  return (
    <Card className="ring-1 ring-border">
      <CardHeader>
        <CardTitle className="text-base">TVs asignadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.appliesToAllDisplays ? (
          <p className="text-sm text-text-muted">
            Este evento aplica a TODAS las TVs cuando está activo. Las asignaciones individuales se ignoran.
          </p>
        ) : allDisplays.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay TVs activas. Empareja al menos una en{" "}
            <Link
              href="/admin/tv/displays"
              className="text-primary hover:underline"
            >
              Pantallas
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allDisplays.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-bg-app"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{d.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Guardando…" : "Guardar asignaciones"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MediaPickerDialog({
  allMedia,
  alreadyAddedIds,
  onClose,
  onAdd,
}: {
  allMedia: TvMedia[];
  alreadyAddedIds: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const addedSet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (addedSet.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar medios desde la biblioteca</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
          {allMedia.map((item) => {
            const already = addedSet.has(item.id);
            const isSel = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                disabled={already}
                className={`relative rounded-lg overflow-hidden bg-black aspect-square ring-2 transition ${
                  isSel
                    ? "ring-primary"
                    : already
                      ? "ring-text-muted/30 opacity-40"
                      : "ring-border hover:ring-primary/50"
                }`}
              >
                {item.type === "menu_board" ? (
                  <div className="w-full h-full flex items-center justify-center bg-amber-500/15 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    MENÚ
                  </div>
                ) : item.type === "image" && item.publicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.publicUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <Video className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5">
                  <p className="text-[10px] text-white truncate">{item.title}</p>
                </div>
                {already && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    Ya agregado
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onAdd(Array.from(selected))}
            disabled={selected.size === 0}
          >
            Agregar {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDatetimeInput(d: Date): string {
  // Format the UTC timestamp as Caracas wall-clock time (UTC-4, no DST).
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // sv-SE produces "YYYY-MM-DD HH:MM" which matches datetime-local value format.
  return fmt.format(d).replace(" ", "T");
}

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
      let thumbnail: Blob | null = null;
      try {
        await new Promise<void>((res) => {
          video.currentTime = Math.min(0.1, video.duration / 2);
          video.onseeked = () => res();
          window.setTimeout(() => res(), 1500);
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(640, width);
        canvas.height = Math.round(canvas.width * (height / width));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnail = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
          );
        }
      } catch { thumbnail = null; }
      URL.revokeObjectURL(url);
      resolve({ duration, width, height, thumbnail });
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("video read error")); };
  });
}

function readImageMetadata(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image read error")); };
    img.src = url;
  });
}
