"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Film,
  RefreshCw,
  GripVertical,
  Trash2,
  Image as ImageIcon,
  Tv,
  Video as VideoIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TvDisplay, TvMedia } from "@/db/schema/tv";
import { setDisplayMediaAction } from "@/actions/tv";

export function MediaThumb({ item }: { item: TvMedia }) {
  return (
    <div className="relative w-10 h-10 rounded overflow-hidden bg-black shrink-0 border border-border">
      {item.type === "image" && item.publicUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.publicUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : item.type === "menu_board" ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-[8px] font-extrabold text-amber-700">
          MENÚ
        </div>
      ) : item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50 bg-slate-950">
          <VideoIcon className="h-4 w-4" />
        </div>
      )}
      <div className="absolute bottom-0 right-0 bg-black/60 p-0.5 rounded-tl-[3px] border-t border-l border-white/5">
        {item.type === "image" ? (
          <ImageIcon className="h-2 w-2 text-white" />
        ) : item.type === "menu_board" ? (
          <Tv className="h-2 w-2 text-white" />
        ) : (
          <VideoIcon className="h-2 w-2 text-white" />
        )}
      </div>
    </div>
  );
}

export function DisplayMediaDialog({
  display,
  onClose,
}: {
  display: TvDisplay;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<TvMedia[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  // Load library + current display selection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(
          `/api/admin/tv/displays/${display.id}/media`,
          { cache: "no-store" },
        );
        if (!resp.ok) {
          toast.error("Error al cargar los medios");
          return;
        }
        const data = (await resp.json()) as {
          library: TvMedia[];
          selectedIds: string[];
        };
        if (cancelled) return;
        setLibrary(data.library);
        setSelectedIds(data.selectedIds);
      } catch {
        if (!cancelled) toast.error("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [display.id]);

  const selectedSet = new Set(selectedIds);
  const selectedItems = selectedIds
    .map((id) => library.find((m) => m.id === id))
    .filter((m): m is TvMedia => Boolean(m));
  const availableItems = library.filter((m) => !selectedSet.has(m.id));

  const toggle = (mediaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId],
    );
  };

  const handleReorderDragStart = (id: string) => {
    dragIdRef.current = id;
  };
  const handleReorderDrop = (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      const from = next.indexOf(sourceId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    const res = await setDisplayMediaAction({
      displayId: display.id,
      mediaIds: selectedIds,
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success(
        selectedIds.length === 0
          ? "Lista de reproducción borrada — esta TV reproducirá toda la biblioteca global"
          : `${selectedIds.length} medio(s) asignados a "${display.name}"`,
      );
      onClose();
    } else {
      toast.error(res?.data?.error ?? "Error al guardar");
    }
  };

  const handleSelectAll = () => setSelectedIds(library.map((m) => m.id));
  const handleClear = () => setSelectedIds([]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl border-border bg-surface-section overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2 pr-8">
            <Film className="h-5 w-5 text-amber-500 animate-pulse" />
            Playlist Curada de &quot;{display.name}&quot;
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0 min-w-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span>Cargando medios de la biblioteca...</span>
            </div>
          ) : library.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-xl bg-slate-500/10 flex items-center justify-center mx-auto mb-4 border border-border">
                <Film className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                La biblioteca de medios está vacía. Sube imágenes, videos o diseña pizarras de menú en la{" "}
                <Link href="/admin/tv?tab=media" className="text-amber-600 hover:underline font-semibold">
                  Biblioteca de medios
                </Link>{" "}
                para poder asignarlos a esta pantalla.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info banner */}
              <div
                className={`rounded-xl border p-4 text-[11px] leading-relaxed ${
                  selectedIds.length === 0
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-800"
                    : "border-emerald-500/20 bg-emerald-500/5 text-text-main"
                }`}
              >
                {selectedIds.length === 0 ? (
                  <>
                    <strong>Modo Global Activo:</strong> Al no tener una playlist exclusiva configurada, esta pantalla reproducirá automáticamente <strong>todos</strong> los medios activos de la biblioteca general en bucle continuo. Marca elementos de la lista inferior para crear una playlist exclusiva.
                  </>
                ) : (
                  <>
                    <strong>Playlist Personalizada:</strong> Esta TV reproducirá de manera exclusiva y cíclica los {selectedIds.length} medio(s) seleccionados, respetando el orden numérico asignado. Haz clic y arrastra el ícono <GripVertical className="h-3 w-3 inline" /> para reordenar la secuencia.
                  </>
                )}
              </div>

              {/* Selected (ordered) */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                      Playlist de la TV ({selectedItems.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-7 text-xs hover:bg-rose-500/10 hover:text-rose-600 font-semibold"
                    >
                      Remover Todos
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleReorderDragStart(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleReorderDrop(item.id)}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-bg-app p-2 cursor-move group hover:border-amber-500/20 hover:bg-amber-500/[0.01] transition"
                      >
                        <GripVertical className="h-4 w-4 text-text-muted shrink-0 cursor-grab active:cursor-grabbing" />
                        <span className="text-[11px] font-mono text-text-muted w-5 shrink-0 font-bold">
                          #{idx + 1}
                        </span>
                        <MediaThumb item={item} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-text-main truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-text-muted capitalize">
                            {item.type === "image" ? "Imagen" : item.type === "menu_board" ? "Pizarra Menú" : "Video"} · {item.durationSeconds}s
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className="p-2 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition shrink-0"
                          title="Quitar de playlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available pool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Medios Disponibles ({availableItems.length})
                  </h3>
                  {availableItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs text-amber-700 hover:bg-amber-500/5 font-semibold"
                    >
                      Añadir Todos
                    </Button>
                  )}
                </div>
                {availableItems.length === 0 ? (
                  <p className="text-[11px] text-text-muted py-2 select-none italic text-center">
                    Has añadido todos los medios disponibles en la biblioteca general.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {availableItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="flex items-center gap-2 rounded-xl border border-border bg-bg-app p-2 hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition text-left group"
                      >
                        <MediaThumb item={item} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-text-main truncate group-hover:text-amber-700">
                            {item.title}
                          </p>
                          <p className="text-[9px] text-text-muted capitalize">
                            {item.type === "image" ? "Imagen" : item.type === "menu_board" ? "Pizarra" : "Video"} · {item.durationSeconds}s
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border/40 bg-bg-app/40 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl border-border">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting || loading} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/5">
            {submitting ? "Guardando…" : "Guardar Playlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
