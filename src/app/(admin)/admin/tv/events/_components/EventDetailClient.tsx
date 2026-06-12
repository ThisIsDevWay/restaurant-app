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
  UtensilsCrossed,
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
import { useConfirm } from "@/components/ui/confirm-dialog";
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

  const { confirm, confirmDialog } = useConfirm();

  const handleRemoveMedia = async (mediaId: string) => {
    const ok = await confirm({
      title: "Quitar medio",
      description: "¿Quitar este medio del evento?",
      confirmLabel: "Quitar",
      destructive: true,
    });
    if (!ok) return;
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
      className="space-y-8 max-w-7xl mx-auto pb-10"
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

      {confirmDialog}

      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/tv/events">
          <Button
            variant="ghost"
            size="sm"
            className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-4 h-8 text-xs transition-all active:scale-[0.96] flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a eventos
          </Button>
        </Link>
        <h1 className="text-3xl font-extrabold text-text-main tracking-tight font-display">{event.name}</h1>
        {event.isActive && (
          <Badge className="bg-success/10 text-success border-0 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Activo
          </Badge>
        )}
      </div>

      <EventInfoSection event={event} />

      <Card className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-display font-bold text-text-main text-base">Medios del evento</CardTitle>
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
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-4 h-8 text-xs transition-all active:scale-[0.96] flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Desde biblioteca
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] rounded-full font-semibold px-4 h-8 text-xs transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? "Subiendo…" : "Subir archivos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queue.length > 0 && (
            <div className="mb-4 rounded-xl border border-border-ghost bg-surface-section/60 p-4 space-y-2">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2 block">
                Subiendo — {queue.filter((q) => q.status === "done").length}/{queue.length}
              </p>
              {queue.map((item) => (
                <div key={item.uid} className="flex items-center gap-3 text-sm">
                  <span className="text-base leading-none">
                    {item.status === "done" && "✅"}
                    {item.status === "error" && "❌"}
                    {item.status === "uploading" && "⏫"}
                    {item.status === "pending" && "⏳"}
                  </span>
                  <span className="flex-1 truncate text-text-main font-medium">{item.file.name}</span>
                  {item.status === "uploading" && (
                    <div className="w-20 h-1.5 bg-border/30 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && (
                    <span className="text-xs text-error shrink-0 max-w-[120px] truncate font-medium" title={item.error}>
                      {item.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {media.length === 0 && queue.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center leading-relaxed">
              Aún no hay medios en este evento. Sube archivos o agrégalos desde la biblioteca.
            </p>
          ) : media.length === 0 ? null : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => {
                    dragIdRef.current = item.id;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(item.id)}
                  className="group relative rounded-[14px] overflow-hidden bg-[#251a07]/5 border border-border-ghost aspect-square cursor-move transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5"
                >
                  {item.type === "menu_board" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-section/40 to-bg-card text-primary text-[10px] font-bold uppercase tracking-widest p-4 text-center">
                      <UtensilsCrossed className="h-6 w-6 mb-2 opacity-80" />
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
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  {item.type === "video" && (
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                      <Video className="h-2.5 w-2.5" /> VIDEO
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <GripVertical className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 pt-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-white truncate font-medium flex-1">
                        {item.title}
                      </p>
                      <button
                        onClick={() => handleRemoveMedia(item.id)}
                        className="text-white/80 hover:text-error transition-colors p-1"
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
    <Card className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="font-display font-bold text-text-main text-base">Información del evento</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <Label htmlFor="ed-name" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
            Nombre
          </Label>
          <Input
            id="ed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="ed-desc" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
            Descripción
          </Label>
          <Input
            id="ed-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label htmlFor="ed-start" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
              Inicio
            </Label>
            <Input
              id="ed-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="ed-end" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
              Fin
            </Label>
            <Input
              id="ed-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-surface-section/40 border border-border-ghost rounded-[10px] hover:bg-surface-section/60 transition-all flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="ev-info-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4.5 w-4.5 text-primary border-border focus:ring-primary rounded cursor-pointer accent-primary"
            />
            <label htmlFor="ev-info-active" className="text-sm font-semibold text-text-main cursor-pointer select-none">
              Evento activo
            </label>
          </div>
          
          <div className="p-3 bg-surface-section/40 border border-border-ghost rounded-[10px] hover:bg-surface-section/60 transition-all flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="ev-info-all-tvs"
              checked={appliesToAllDisplays}
              onChange={(e) => setAppliesToAllDisplays(e.target.checked)}
              className="h-4.5 w-4.5 text-primary border-border focus:ring-primary rounded cursor-pointer accent-primary"
            />
            <label htmlFor="ev-info-all-tvs" className="text-sm font-semibold text-text-main cursor-pointer select-none">
              Aplicar a todas las TVs
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            disabled={submitting}
            className="rounded-full bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] shadow-sm transition-all font-semibold h-10 px-6 text-sm flex items-center gap-2"
          >
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
    <Card className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="font-display font-bold text-text-main text-base">TVs asignadas</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-4">
        {event.appliesToAllDisplays ? (
          <p className="text-sm text-text-muted leading-relaxed">
            Este evento aplica a TODAS las TVs cuando está activo. Las asignaciones individuales se ignoran.
          </p>
        ) : allDisplays.length === 0 ? (
          <p className="text-sm text-text-muted leading-relaxed">
            No hay TVs activas. Empareja al menos una en{" "}
            <Link
              href="/admin/tv"
              className="text-primary hover:underline font-semibold"
            >
              Pantallas
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allDisplays.map((d) => (
                <label
                  key={d.id}
                  className="p-3.5 bg-surface-section/40 hover:bg-surface-section/80 border border-border-ghost rounded-[10px] cursor-pointer transition-all flex items-center gap-2.5"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="h-4.5 w-4.5 text-primary border-border focus:ring-primary rounded cursor-pointer accent-primary"
                  />
                  <span className="text-sm font-semibold text-text-main select-none">{d.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={save} 
                disabled={saving}
                className="rounded-full bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] shadow-sm transition-all font-semibold h-10 px-6 text-sm flex items-center gap-2"
              >
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
      <DialogContent className="max-w-3xl border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display font-bold text-text-main text-lg">
            Agregar medios desde la biblioteca
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
          {allMedia.map((item) => {
            const already = addedSet.has(item.id);
            const isSel = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                disabled={already}
                className={`relative rounded-[12px] overflow-hidden bg-[#251a07]/5 border border-border-ghost aspect-square cursor-pointer transition-all duration-300 ${
                  isSel
                    ? "ring-2 ring-primary bg-primary/5 border-primary/50 shadow-md"
                    : already
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
                }`}
              >
                {item.type === "menu_board" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-section/40 to-bg-card text-primary text-[9px] font-bold uppercase tracking-widest p-2 text-center">
                    <UtensilsCrossed className="h-5 w-5 mb-1.5 opacity-80" />
                    Menú
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
                  <div className="w-full h-full relative">
                    <video
                      src={item.publicUrl}
                      muted
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                      <Video className="h-6 w-6 opacity-85" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-section text-primary/60">
                    <Video className="h-6 w-6" />
                  </div>
                )}
                {item.type === "video" && (
                  <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 shadow-sm">
                    <Video className="h-2 w-2" /> VIDEO
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-4">
                  <p className="text-[10px] text-white truncate font-medium">{item.title}</p>
                </div>
                {already && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs font-semibold text-white">
                    Agregado
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border-ghost">
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-4 h-9 text-xs transition-all active:scale-[0.96] shadow-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onAdd(Array.from(selected))}
            disabled={selected.size === 0}
            className="bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] rounded-full font-semibold px-5 h-9 text-xs transition-all flex items-center gap-1.5 shadow-sm"
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
