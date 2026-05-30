"use client";

import React from "react";
import {
  Video,
  VolumeX,
  Volume2,
  Image as ImageIcon,
  UtensilsCrossed,
  Clock,
  GripVertical,
  Settings,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TvMedia, TvMenuBoardConfig } from "@/db/schema/tv";
import { cleanTitle } from "./media-client-utils";

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

/* ───────────────────────── Menu Board Preview (grid card) ───────────────────────── */

export function MenuBoardPreview({ item }: { item: TvMedia }) {
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

/* ───────────────────────── Media Card ───────────────────────── */

export function MediaCard({
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

      {/* Bottom info bar */}
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
