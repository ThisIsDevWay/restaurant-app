"use client";

import { forwardRef, type PointerEvent as ReactPointerEvent } from "react";
import { 
  RotateCw, Trash2, Maximize2, 
  Users, X, RefreshCw
} from "lucide-react";
import { CELL_SIZE, paletteFor } from "@/lib/salon-constants";
import type { TableRotation } from "@/lib/salon-types";
import { FixtureIcon, SectionDot, ShapeIcon } from "@/components/salon/SalonSharedUI";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture } from "@/db/schema/floor-fixtures";
import type { TablePosition } from "@/store/tableLayoutStore";
import type { FixturePosition } from "@/store/fixtureLayoutStore";
import { cn } from "@/lib/utils";
import { FIXTURE_CATALOG } from "@/lib/fixture-catalog";

const CATALOG_BY_TYPE = Object.fromEntries(FIXTURE_CATALOG.map(f => [f.type, f]));

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
  setActiveSection: (s: string) => void;
  sections: string[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedFixtureId: string | null;
  setSelectedFixtureId: (id: string | null | ((prev: string | null) => string | null)) => void;
  editMode: "tables" | "space";
  draggingId: string | null;
  resizingId?: string | null;
  
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  
  onTablePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onTableRotate: (id: string) => void;
  
  onFixturePointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onFixtureDelete: (id: string) => void;
  onFixtureResizeStart: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
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
  setActiveSection,
  sections,
  selectedId,
  setSelectedId,
  selectedFixtureId,
  setSelectedFixtureId,
  editMode,
  draggingId,
  resizingId,
  onPointerMove,
  onPointerUp,
  onDragOver,
  onDrop,
  onTablePointerDown,
  onTableRotate,
  onFixturePointerDown,
  onFixtureDelete,
  onFixtureResizeStart,
  onFixtureLabelChange,
  onFixtureRotate,
}, ref) => {
  // Heritage Colors
  const ink = "#251a07";
  const red = "#bb0005";
  const outlineVariant = "#e9e2d9";
  const surfaceLow = "#f5ece0";

  const visibleTables = tables.filter(t => activeSection === "all" || t.section === activeSection);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* Section filter bar */}
      <div
        className="flex shrink-0 items-center gap-2 overflow-x-auto px-6 py-3 scrollbar-none"
        style={{ borderBottom: `1px solid ${outlineVariant}`, background: "#fff" }}
      >
        {["all", ...sections].map((sec) => {
          const active = activeSection === sec;
          const pal = sec === "all" ? null : paletteFor(sec);
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: active ? (pal?.border ?? red) : surfaceLow,
                color: active ? "#fff" : ink,
                boxShadow: active ? `0 2px 12px ${pal?.border ?? red}40` : "none",
              }}
            >
              {sec !== "all" && pal && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: active ? "#fff8" : pal.border }}
                />
              )}
              {sec === "all" ? "Todas" : sec}
            </button>
          );
        })}
      </div>

      {/* Canvas Scroll Area */}
      <div
        className="flex-1 overflow-auto"
        style={{ background: "#f5ede4" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="flex min-h-full min-w-full items-start justify-center p-10">
          <div
            ref={ref}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="relative origin-top transition-shadow duration-300 touch-none select-none"
            style={{
              width: gridCols * CELL_SIZE * zoom,
              height: gridRows * CELL_SIZE * zoom,
              background: "#fffaf6",
              borderRadius: 16,
              boxShadow: "0 8px 64px rgba(37,26,7,0.12), 0 2px 8px rgba(37,26,7,0.06)",
              backgroundImage: "radial-gradient(circle, #d4bfa8 1px, transparent 1px)",
              backgroundSize: `${CELL_SIZE * zoom}px ${CELL_SIZE * zoom}px`,
            }}
          >
            {/* Render Fixtures */}
            {fixtures.map((fixture) => {
              const pos = fixturePositions[fixture.id] ?? fixture;
              const isSelected = selectedFixtureId === fixture.id && editMode === "space";
              const isDraggingThis = draggingId === fixture.id;
              const entry = CATALOG_BY_TYPE[fixture.type];
              if (!entry) return null;

              return (
                <div
                  key={fixture.id}
                  onPointerDown={(e) => editMode === "space" && onFixturePointerDown(e, fixture.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode === "space") {
                      setSelectedFixtureId(prev => prev === fixture.id ? null : fixture.id);
                    }
                  }}
                  className="absolute flex items-center justify-center select-none"
                  style={{
                    left: (pos.gridCol - 1) * CELL_SIZE * zoom,
                    top: (pos.gridRow - 1) * CELL_SIZE * zoom,
                    width: (pos.rotation === 90 || pos.rotation === 270 ? pos.rowSpan : pos.colSpan) * CELL_SIZE * zoom,
                    height: (pos.rotation === 90 || pos.rotation === 270 ? pos.colSpan : pos.rowSpan) * CELL_SIZE * zoom,
                    cursor: editMode === "space" ? (isDraggingThis ? "grabbing" : "grab") : "default",
                    touchAction: "none",
                    zIndex: isSelected ? 5 : 0,
                    willChange: "transform",
                    pointerEvents: editMode === "space" ? "auto" : "none",
                    opacity: editMode === "tables" ? 0.4 : 1,
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center w-full h-full overflow-hidden relative"
                    style={{
                      background: entry.isTransparent ? "transparent" : entry.bg,
                      border: entry.isTransparent ? "none" : `1.5px solid ${isSelected ? red : entry.border}`,
                      borderRadius: entry.isWall ? 0 : 8,
                      boxShadow: isSelected ? `0 0 0 3px ${red}30` : "none",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {!entry.isWall && (
                        <FixtureIcon type={fixture.type} size={16 * Math.max(1, zoom)} color={entry.textColor} />
                      )}
                      
                      {isSelected ? (
                        <input
                          autoFocus
                          placeholder="Nombre..."
                          value={fixture.label ?? ""}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onFixtureLabelChange(fixture.id, e.target.value || null)}
                          className="w-full px-1 bg-transparent border-none text-center outline-none font-bold placeholder:text-slate-400"
                          style={{ 
                            color: entry.textColor, 
                            fontSize: Math.max(10, 14 * zoom),
                            zIndex: 10
                          }}
                        />
                      ) : fixture.label ? (
                        <span 
                          className="px-1 text-center font-bold break-words w-full"
                          style={{ color: entry.textColor, fontSize: Math.max(10, 14 * zoom) }}
                        >
                          {fixture.label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSelected && (
                    <>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setSelectedFixtureId(null); }}
                        className="absolute flex items-center justify-center rounded-full bg-slate-800 text-white shadow-lg"
                        style={{ top: -12, left: -12, width: 24, height: 24, zIndex: 12, border: "2px solid #fff" }}
                      >
                        <X size={14} />
                      </button>

                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onFixtureDelete(fixture.id); }}
                        className="absolute flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
                        style={{ top: -12, right: -12, width: 24, height: 24, zIndex: 12, border: "2px solid #fff" }}
                      >
                        <Trash2 size={12} strokeWidth={2.5} />
                      </button>

                      <div 
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 flex items-center gap-2 p-2 rounded-2xl bg-white shadow-2xl border pointer-events-auto"
                        style={{ borderColor: outlineVariant, zIndex: 20 }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onFixtureRotate(fixture.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs"
                          style={{ color: red }}
                        >
                          <RefreshCw size={14} />
                          <span>Rotar</span>
                        </button>
                      </div>

                      <div
                        onPointerDown={(e) => onFixtureResizeStart(e, fixture.id)}
                        className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30"
                        style={{
                          background: `linear-gradient(135deg, transparent 50%, ${red} 50%)`,
                          borderBottomRightRadius: entry.isWall ? 0 : 8,
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white translate-x-1 translate-y-1" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Render Tables */}
            {visibleTables.map((table) => {
              const pos = positions[table.id] ?? table;
              const pal = paletteFor(table.section);
              const isSelected = selectedId === table.id && editMode === "tables";
              const isDraggingThis = draggingId === table.id;
              const rotation = rotations[table.id] ?? table.rotation ?? 0;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => editMode === "tables" && onTablePointerDown(e, table.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode === "tables") {
                      setSelectedId(isSelected ? null : table.id);
                    }
                  }}
                  className="absolute flex items-center justify-center select-none"
                  style={{
                    left: (pos.gridCol - 1) * CELL_SIZE * zoom + 3 * zoom,
                    top: (pos.gridRow - 1) * CELL_SIZE * zoom + 3 * zoom,
                    width: pos.colSpan * CELL_SIZE * zoom - 6 * zoom,
                    height: pos.rowSpan * CELL_SIZE * zoom - 6 * zoom,
                    cursor: editMode === "tables" ? (isDraggingThis ? "grabbing" : "grab") : "default",
                    touchAction: "none",
                    zIndex: isSelected ? 10 : 1,
                    willChange: "transform",
                    pointerEvents: editMode === "tables" ? "auto" : "none",
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center w-full h-full overflow-hidden transition-all"
                    style={{
                      background: table.isActive ? pal.bg : surfaceLow,
                      border: `${isSelected ? 3 * zoom : 2 * zoom}px solid ${isSelected ? red : pal.border}`,
                      borderRadius: table.shape === "circular" ? "999px" : 8 * zoom,
                      opacity: table.isActive ? 1 : 0.5,
                      transform: `rotate(${rotation}deg)`,
                      boxShadow: isSelected ? `0 12px 32px ${red}30` : "none",
                    }}
                  >
                    <div
                      className="flex flex-col items-center justify-center"
                      style={{ transform: `rotate(-${rotation}deg)` }}
                    >
                      <span
                        className="font-black text-center leading-none"
                        style={{
                          color: table.isActive ? pal.text : ink,
                          fontSize: Math.max(10, (table.label.length > 3 ? 12 : 14) * zoom),
                          fontFamily: "var(--font-epilogue, serif)",
                        }}
                      >
                        {table.label}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 opacity-50">
                        <Users size={10 * zoom} style={{ color: pal.text }} />
                        <span className="font-bold" style={{ color: pal.text, fontSize: 9 * zoom }}>
                          {table.capacity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && !isDraggingThis && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -right-3 -top-3 flex flex-col gap-1"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onTableRotate(table.id); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xl ring-1 ring-black/5"
                        style={{ color: red }}
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

FloorCanvas.displayName = "FloorCanvas";
