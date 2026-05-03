"use client";

import { forwardRef, type PointerEvent as ReactPointerEvent } from "react";
import { 
  RotateCcw, Trash2, Maximize2, 
  Square, Circle, RectangleHorizontal, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CELL_SIZE, paletteFor } from "@/lib/salon-constants";
import type { TableRotation } from "@/lib/salon-types";
import { FixtureIcon, SectionDot, ShapeIcon } from "@/components/salon/SalonSharedUI";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture } from "@/db/schema/floor-fixtures";
import type { TablePosition } from "@/store/tableLayoutStore";
import type { FixturePosition } from "@/store/fixtureLayoutStore";
import { cn } from "@/lib/utils";

interface FloorCanvasProps {
  tables: RestaurantTable[];
  fixtures: FloorFixture[];
  positions: Record<string, TablePosition>;
  fixturePositions: Record<string, FixturePosition>;
  rotations: Record<string, TableRotation>;
  zoom: number;
  gridCols: number;
  gridRows: number;
  activeSection: string;
  selectedId: string | null;
  selectedFixtureId: string | null;
  editMode: "tables" | "space";
  draggingId: string | null;
  resizingId?: string | null;
  
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  
  onTablePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onTableClick: (id: string) => void;
  onTableRotate: (id: string) => void;
  
  onFixturePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onFixtureClick: (id: string) => void;
  onFixtureDelete: (id: string) => void;
  onFixtureResize: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onFixtureLabelChange: (id: string, label: string | null) => void;
  onFixtureRotate: (id: string) => void;
}

export const FloorCanvas = forwardRef<HTMLDivElement, FloorCanvasProps>(({
  tables,
  fixtures,
  positions,
  fixturePositions,
  rotations,
  zoom,
  gridCols,
  gridRows,
  activeSection,
  selectedId,
  selectedFixtureId,
  editMode,
  draggingId,
  resizingId,
  onPointerMove,
  onPointerUp,
  onDragOver,
  onDrop,
  onTablePointerDown,
  onTableClick,
  onTableRotate,
  onFixturePointerDown,
  onFixtureClick,
  onFixtureDelete,
  onFixtureResize,
  onFixtureLabelChange,
  onFixtureRotate,
}, ref) => {
  return (
    <div className="relative flex-1 overflow-auto bg-[#f5ece0] p-8 lg:p-12">
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="relative mx-auto touch-none select-none rounded-3xl bg-white shadow-2xl transition-all duration-300"
        style={{
          width: gridCols * CELL_SIZE * zoom,
          height: gridRows * CELL_SIZE * zoom,
          backgroundImage: `radial-gradient(#e9e2d9 1.5px, transparent 0)`,
          backgroundSize: `${CELL_SIZE * zoom}px ${CELL_SIZE * zoom}px`,
          backgroundPosition: `-0.75px -0.75px`,
        }}
      >
        {/* Render Fixtures */}
        {fixtures.map((f) => {
          const pos = fixturePositions[f.id];
          if (!pos) return null;

          const isSelected = selectedFixtureId === f.id;
          const isDragging = draggingId === f.id;
          const isResizing = resizingId === f.id;

          const pixelX = (pos.gridCol - 1) * CELL_SIZE * zoom;
          const pixelY = (pos.gridRow - 1) * CELL_SIZE * zoom;
          const pixelW = pos.colSpan * CELL_SIZE * zoom;
          const pixelH = pos.rowSpan * CELL_SIZE * zoom;

          return (
            <div
              key={f.id}
              onPointerDown={(e) => onFixturePointerDown(e, f.id)}
              onClick={(e) => { e.stopPropagation(); onFixtureClick(f.id); }}
              className={cn(
                "absolute flex items-center justify-center transition-shadow",
                editMode === "space" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                isSelected && editMode === "space" ? "ring-2 ring-black ring-offset-2 z-30" : "z-10",
                isDragging ? "opacity-40" : "opacity-100"
              )}
              style={{
                left: pixelX,
                top: pixelY,
                width: pixelW,
                height: pixelH,
                transform: `rotate(${pos.rotation}deg)`,
              }}
            >
              <div className="relative h-full w-full flex items-center justify-center">
                <FixtureIcon 
                  type={f.type} 
                  size={Math.min(pixelW, pixelH) * 0.7} 
                  color={isSelected && editMode === "space" ? "#bb0005" : "#9a7a5a"} 
                />
                
                {isSelected && editMode === "space" && (
                  <>
                    {/* Fixture Controls */}
                    <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1 shadow-xl ring-1 ring-[#e9e2d9]">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-[#9a7a5a] hover:bg-[#fff2e2] hover:text-[#bb0005]"
                        onClick={(e) => { e.stopPropagation(); onFixtureRotate(f.id); }}
                      >
                        <RotateCcw size={14} />
                      </Button>
                      <div className="h-4 w-px bg-[#e9e2d9]" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-[#9a7a5a] hover:bg-red-50 hover:text-[#bb0005]"
                        onClick={(e) => { e.stopPropagation(); onFixtureDelete(f.id); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>

                    {/* Resize Handle */}
                    <div
                      onPointerDown={(e) => onFixtureResize(e, f.id)}
                      className="absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-full bg-[#bb0005] p-1 text-white shadow-lg active:scale-125 transition-transform"
                    >
                      <Maximize2 size={12} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Render Tables */}
        {tables.map((t) => {
          const pos = positions[t.id];
          if (!pos) return null;

          const p = paletteFor(t.section);
          const isSelected = selectedId === t.id;
          const isDragging = draggingId === t.id;
          const rotation = rotations[t.id] ?? t.rotation ?? 0;
          const isFocused = activeSection === "all" || t.section === activeSection;

          const pixelX = (pos.gridCol - 1) * CELL_SIZE * zoom;
          const pixelY = (pos.gridRow - 1) * CELL_SIZE * zoom;
          const pixelW = pos.colSpan * CELL_SIZE * zoom;
          const pixelH = pos.rowSpan * CELL_SIZE * zoom;

          return (
            <div
              key={t.id}
              onPointerDown={(e) => onTablePointerDown(e, t.id)}
              onClick={(e) => { e.stopPropagation(); onTableClick(t.id); }}
              className={cn(
                "absolute flex flex-col items-center justify-center overflow-hidden transition-all duration-200 z-20",
                editMode === "tables" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                !isFocused && "opacity-20 scale-95 grayscale-[0.5]",
                isSelected && editMode === "tables" ? "ring-2 ring-[#bb0005] ring-offset-4 z-40" : "",
                !t.isActive && "opacity-40 grayscale"
              )}
              style={{
                left: pixelX,
                top: pixelY,
                width: pixelW,
                height: pixelH,
                backgroundColor: p.bg,
                borderColor: p.border,
                borderWidth: isSelected ? 3 : 2,
                borderRadius: t.shape === "circular" ? "9999px" : "16px",
                transform: `rotate(${rotation}deg)`,
                boxShadow: isSelected ? `0 20px 50px rgba(187,0,5,0.25)` : "none",
              }}
            >
              <div
                className="flex flex-col items-center justify-center p-1 text-center"
                style={{ transform: `rotate(-${rotation}deg)` }}
              >
                <div className="flex items-center gap-1">
                  <span className="font-display text-base font-black leading-none" style={{ color: p.text }}>
                    {t.label}
                  </span>
                  {!t.isActive && <Trash2 size={10} className="text-[#9a7a5a]" />}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 opacity-60">
                  <ShapeIcon shape={t.shape as any} size={10} />
                  <span className="text-[9px] font-black tracking-tighter" style={{ color: p.text }}>
                    {t.capacity}P
                  </span>
                </div>
              </div>

              {/* Table Quick Controls */}
              {isSelected && editMode === "tables" && !isDragging && (
                <div 
                  className="absolute bottom-1 right-1 flex items-center gap-1"
                  style={{ transform: `rotate(-${rotation}deg)` }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onTableRotate(t.id); }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-[#bb0005] shadow-sm hover:bg-white active:scale-90 transition-transform"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

FloorCanvas.displayName = "FloorCanvas";
