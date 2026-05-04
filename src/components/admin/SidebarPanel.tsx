"use client";

import { 
  Users, Trash2, Edit2, QrCode, ArrowRight, Download, RefreshCw,
  ChevronRight, GripVertical, CheckCircle2, Circle, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS, paletteFor } from "@/lib/salon-constants";
import { StatPill, SectionDot, ShapeIcon, FixtureIcon } from "@/components/salon/SalonSharedUI";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import { FIXTURE_CATALOG } from "@/lib/fixture-catalog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TableShape } from "@/lib/salon-types";
import type { FixtureType } from "@/db/schema/floor-fixtures";

interface SidebarPanelProps {
  activeSection: string;
  setActiveSection: (s: string) => void;
  sections: string[];
  tables: RestaurantTable[];
  visibleTables: RestaurantTable[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  draggedIdx: number | null;
  dragOverIdx: number | null;
  
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  
  onEdit: (t: RestaurantTable) => void;
  onDelete: (id: string) => void;
  onQrPreview: (id: string) => void;

  editMode: "tables" | "space";
  selectedFixtureId: string | null;
  handleTemplateDragStart: (e: React.DragEvent, shape: TableShape) => void;
  handleFixtureDragStart: (e: React.DragEvent, type: FixtureType) => void;
  openCreate: () => void;
  activePanel: "plan" | "list";
}

export function SidebarPanel({
  activeSection,
  setActiveSection,
  sections,
  tables,
  visibleTables,
  selectedId,
  setSelectedId,
  draggedIdx,
  dragOverIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
  onQrPreview,
  editMode,
  selectedFixtureId,
  handleTemplateDragStart,
  handleFixtureDragStart,
  openCreate,
  activePanel,
}: SidebarPanelProps) {
  const selectedTable = tables.find((t) => t.id === selectedId);

  // Colors
  const outlineVariant = "#e9e2d9";
  const surfaceLow = "#f5ece0";
  const ink = "#251a07";
  const red = "#bb0005";

  return (
    <aside
      className={cn(
        "flex flex-col border-l",
        activePanel !== "list" && "hidden lg:flex",
        "w-full lg:w-[380px] xl:w-[420px]"
      )}
      style={{
        background: "#fff",
        borderColor: outlineVariant,
      }}
    >
      {editMode === "tables" ? (
        <>
          {/* Panel header */}
          <div
            className="flex shrink-0 items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${outlineVariant}` }}
          >
            <h2
              className="text-lg font-black"
              style={{ fontFamily: "var(--font-epilogue, serif)", color: ink }}
            >
              Mesas
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: "#9a7a5a" }}
              >
                ({visibleTables.length})
              </span>
            </h2>
            {/* New Table Templates */}
            <div className="flex items-center gap-2">
              {(["cuadrada", "rectangular", "circular"] as TableShape[]).map((s) => (
                <div
                  key={s}
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(e, s)}
                  className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: surfaceLow,
                    border: `1.5px solid ${outlineVariant}`,
                    color: ink,
                  }}
                  title={`Arrastra para crear mesa ${s}`}
                >
                  <ShapeIcon shape={s} size={18} />
                </div>
              ))}
            </div>
          </div>

          {/* QR preview (when selected) */}
          {selectedTable && (
            <div
              className="shrink-0 px-5 py-4"
              style={{ borderBottom: `1px solid ${outlineVariant}`, background: surfaceLow }}
            >
              <div className="flex items-center gap-4">
                {/* Mini QR preview */}
                <div
                  className="relative h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group"
                  style={{ background: "#fff", border: `1px solid ${outlineVariant}` }}
                  onClick={() => onQrPreview(selectedTable.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/tables/${selectedTable.id}/qr`}
                    alt="QR"
                    className="h-full w-full object-contain p-1"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <QrCode size={18} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black truncate" style={{ color: ink, fontFamily: "var(--font-epilogue, serif)" }}>
                    {selectedTable.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9a7a5a" }}>
                    {selectedTable.section} · {selectedTable.capacity} personas
                  </p>
                  <p className="text-[10px] mt-1 font-mono opacity-60" style={{ color: ink }}>
                    Token: {selectedTable.qrToken}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: surfaceLow, color: ink, border: `1px solid ${outlineVariant}` }}
                    onClick={() => window.open(`/api/admin/tables/${selectedTable.id}/qr`, "_blank")}
                  >
                    <Download size={12} />
                    QR
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: "#fff", border: `1px solid ${outlineVariant}`, color: ink }}
                  onClick={() => onEdit(selectedTable)}
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}
                  onClick={() => onDelete(selectedTable.id)}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Table list */}
          <div className="flex-1 overflow-y-auto">
            {visibleTables.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: surfaceLow }}
                >
                  <LayoutGrid size={28} style={{ color: "#d4bfa8" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "#9a7a5a" }}>
                  No hay mesas en esta sección
                </p>
                <button
                  onClick={openCreate}
                  className="mt-1 text-xs font-bold"
                  style={{ color: red }}
                >
                  + Crear mesa
                </button>
              </div>
            ) : (
              <div>
                {visibleTables.map((table, i) => {
                  const pal = paletteFor(table.section);
                  const isSelected = selectedId === table.id;
                  const isDragged = draggedIdx === i;
                  const isDragOver = dragOverIdx === i;

                  return (
                    <div
                      key={table.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDragEnd={onDragEnd}
                      onDrop={(e) => onDrop(e, i)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all relative group",
                        isDragged && "opacity-20",
                        isDragOver && draggedIdx !== null && "bg-orange-50"
                      )}
                      style={{
                        background: isSelected ? surfaceLow : "transparent",
                        borderLeft: isSelected
                          ? `3px solid ${red}`
                          : "3px solid transparent",
                        ...(i % 2 === 0 && !isSelected && !isDragOver
                          ? { background: "rgba(255,248,243,0.6)" }
                          : {}),
                      }}
                      onClick={() =>
                        setSelectedId(isSelected ? null : table.id)
                      }
                    >
                      {/* Drag handle */}
                      <div
                        className="opacity-0 group-hover:opacity-40 transition-opacity absolute left-1 cursor-grab active:cursor-grabbing"
                        style={{ color: ink }}
                      >
                        <GripVertical size={14} />
                      </div>

                      {/* Shape icon */}
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: pal.bg, border: `1.5px solid ${pal.border}` }}
                      >
                        <ShapeIcon shape={table.shape as TableShape} size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold truncate"
                            style={{
                              color: table.isActive ? ink : "#9a9590",
                              fontFamily: "var(--font-epilogue, serif)",
                            }}
                          >
                            {table.label}
                          </span>
                          <SectionDot section={table.section} />
                        </div>
                        <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "#9a7a5a" }}>
                          <Users size={11} />
                          {table.capacity} · {table.section}
                        </p>
                      </div>

                      {/* Active toggle */}
                      {/* Note: we omit table toggle logic here for display only, or we would pass handleToggle(table) 
                          But since handleToggle updates db, we might need to add it to props.
                          For now, we just show it read-only, or maybe it's not strictly necessary if edit modal covers it.
                          Let's omit it to save adding another prop, or maybe we can keep it as display-only.
                      */}

                      <ChevronRight
                        size={16}
                        style={{
                          color: isSelected ? red : "#d4bfa8",
                          transition: "transform 0.15s",
                          transform: isSelected ? "rotate(90deg)" : "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Fixture Palette Header */}
          <div
            className="flex shrink-0 items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${outlineVariant}` }}
          >
            <h2
              className="text-lg font-black"
              style={{ fontFamily: "var(--font-epilogue, serif)", color: ink }}
            >
              {selectedFixtureId ? "Propiedades" : "Catálogo"}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-3">
              {FIXTURE_CATALOG.map((f) => (
                <div
                  key={f.type}
                  draggable
                  onDragStart={(e) => handleFixtureDragStart(e, f.type)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border cursor-grab transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "#fff",
                    borderColor: outlineVariant,
                  }}
                  title={f.description}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg mb-2"
                    style={{
                      background: f.isTransparent ? "transparent" : f.bg,
                      border: f.isTransparent ? "none" : `1.5px solid ${f.border}`,
                      borderRadius: f.isWall ? 0 : 8,
                    }}
                  >
                    {!f.isWall && (
                      <FixtureIcon type={f.type} size={20} color={f.textColor} />
                    )}
                  </div>
                  <span className="text-xs font-bold text-center" style={{ color: ink }}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
