"use client";

import { 
  Users, Trash2, Edit3, QrCode, ArrowRight, 
  ChevronRight, GripVertical, CheckCircle2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS, paletteFor } from "@/lib/salon-constants";
import { StatPill, SectionDot, ShapeIcon } from "@/components/salon/SalonSharedUI";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import { cn } from "@/lib/utils";

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
}: SidebarPanelProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-[#e9e2d9] bg-[#fffcf9] lg:w-96">
      {/* Sections Filter */}
      <div className="border-b border-[#e9e2d9] p-6">
        <h2 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#9a7a5a]">
          SECCIONES DEL RESTAURANTE
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection("all")}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
              activeSection === "all"
                ? "border-[#251a07] bg-[#251a07] text-white"
                : "border-[#e9e2d9] bg-white text-[#9a7a5a] hover:border-[#9a7a5a]"
            }`}
          >
            TODAS
            <span className="opacity-50">{tables.length}</span>
          </button>
          {sections.map((s) => {
            const count = tables.filter((t) => t.section === s).length;
            const p = paletteFor(s);
            return (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                  activeSection === s
                    ? "border-[#251a07] bg-[#251a07] text-white"
                    : "border-[#e9e2d9] bg-white text-[#9a7a5a] hover:border-[#9a7a5a]"
                }`}
              >
                <SectionDot section={s} />
                {s.toUpperCase()}
                <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a7a5a]">
            LISTADO DE MESAS ({visibleTables.length})
          </h2>
          {activeSection !== "all" && (
            <StatPill label="Capacidad Total" value={visibleTables.reduce((acc, t) => acc + (t.capacity || 0), 0)} />
          )}
        </div>

        <div className="space-y-3">
          {visibleTables.map((t, idx) => {
            const isSelected = selectedId === t.id;
            const p = paletteFor(t.section);
            const isDragging = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx;

            return (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                onDrop={(e) => onDrop(e, idx)}
                onClick={() => setSelectedId(isSelected ? null : t.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 bg-white transition-all duration-300",
                  isSelected 
                    ? "border-[#bb0005] shadow-xl shadow-red-900/5 -translate-y-0.5" 
                    : "border-[#e9e2d9] hover:border-[#9a7a5a] hover:shadow-lg",
                  isDragging && "opacity-20 scale-95",
                  isDragOver && "border-dashed border-[#bb0005] bg-red-50",
                  !t.isActive && "opacity-60"
                )}
              >
                {/* Drag Handle */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                  <GripVertical size={16} className="text-[#9a7a5a]" />
                </div>

                <div className="flex items-center gap-4 p-4 pl-8">
                  <div 
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-lg font-black"
                    style={{ backgroundColor: p.bg, color: p.text }}
                  >
                    {t.label}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-black text-[#251a07]">
                        {t.label}
                      </h3>
                      {!t.isActive && (
                        <span className="rounded-full bg-[#f5ece0] px-2 py-0.5 text-[8px] font-black uppercase text-[#9a7a5a]">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-black text-[#9a7a5a]">
                        <Users size={12} />
                        {t.capacity} PERSONAS
                      </div>
                      <div className="h-3 w-px bg-[#e9e2d9]" />
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[#9a7a5a]">
                        <ShapeIcon shape={t.shape as any} size={12} />
                        {t.shape}
                      </div>
                    </div>
                  </div>

                  <ChevronRight 
                    className={cn(
                      "transition-transform duration-300",
                      isSelected ? "rotate-90 text-[#bb0005]" : "text-[#e9e2d9]"
                    )} 
                    size={20} 
                  />
                </div>

                {/* Expanded Actions */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden border-t border-[#f5ece0] bg-[#fffcf9]">
                    <div className="grid grid-cols-3 divide-x divide-[#f5ece0]">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                        className="flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-wider text-[#9a7a5a] transition-colors hover:bg-white hover:text-[#251a07]"
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onQrPreview(t.id); }}
                        className="flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-wider text-[#9a7a5a] transition-colors hover:bg-white hover:text-[#251a07]"
                      >
                        <QrCode size={16} />
                        Ver QR
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                        className="flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-wider text-[#9a7a5a] transition-colors hover:bg-red-50 hover:text-[#bb0005]"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
