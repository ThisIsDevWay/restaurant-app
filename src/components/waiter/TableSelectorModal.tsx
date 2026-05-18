"use client";

import { X, Users, Map } from "lucide-react";
import { 
  CELL_SIZE, 
  paletteFor 
} from "@/lib/salon-constants";
import { FixtureIcon } from "@/components/salon/SalonSharedUI";
import { CATALOG_BY_TYPE } from "@/lib/fixture-catalog";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture } from "@/db/schema/floor-fixtures";

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  fixtures: FloorFixture[];
  gridCols: number;
  gridRows: number;
  layoutZoom: number;
  onSelectTable: (label: string) => void;
}

export function TableSelectorModal({
  isOpen,
  onClose,
  tables,
  fixtures,
  gridCols,
  gridRows,
  layoutZoom: _layoutZoom,
  onSelectTable,
}: TableSelectorModalProps) {
  if (!isOpen) return null;

  // Compute the tight bounding box of actual content (tables + fixtures).
  // The admin grid is 20×14 cells but content rarely fills every cell —
  // fitting to the real extent instead of the full grid yields a larger zoom.
  const allItems = [
    ...tables.map((t) => ({ col: t.gridCol, row: t.gridRow, cs: t.colSpan ?? 1, rs: t.rowSpan ?? 1 })),
    ...fixtures.map((f) => ({ col: f.gridCol, row: f.gridRow, cs: f.colSpan ?? 1, rs: f.rowSpan ?? 1 })),
  ];
  const usedCols = allItems.length > 0 ? Math.max(...allItems.map((i) => i.col + i.cs - 1)) : gridCols;
  const usedRows = allItems.length > 0 ? Math.max(...allItems.map((i) => i.row + i.rs - 1)) : gridRows;
  // Add 1-cell margin so content doesn't touch the canvas edge.
  const effectiveCols = Math.min(usedCols + 1, gridCols);
  const effectiveRows = Math.min(usedRows + 1, gridRows);

  // Fit zoom to available modal area (both axes) so no scrollbars appear.
  // header ~61px + footer ~40px + p-4 top+bottom 32px = 133px reserved.
  const layoutZoom = typeof window !== "undefined"
    ? (() => {
        const modalW = Math.min(window.innerWidth - 32, 896);
        const availW = modalW - 32; // p-4 (16px) × 2 horizontal
        const availH = window.innerHeight * 0.9 - 133 - 32; // reserved + p-4 vertical
        const z = Math.min(availW / (effectiveCols * CELL_SIZE), availH / (effectiveRows * CELL_SIZE));
        return Math.min(Math.max(z, 0.45), 1);
      })()
    : _layoutZoom;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-full max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-xl font-bold text-[var(--color-text-main)] font-display">
            Seleccionar Mesa
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#f5ede4] relative">
          {typeof window !== "undefined" && window.innerWidth < 768 ? (
            /* Mobile: Simple Grid of Tables */
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables
                .filter((t) => t.isActive)
                .sort((a, b) =>
                  a.label.localeCompare(b.label, undefined, { numeric: true })
                )
                .map((table) => {
                  const pal = paletteFor(table.section);
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        const onlyNumber = table.label
                          .replace(/mesa\s*/i, "")
                          .trim();
                        onSelectTable(onlyNumber);
                      }}
                      className="aspect-square flex flex-col items-center justify-center rounded-2xl shadow-sm border-2 transition-transform active:scale-95"
                      style={{
                        backgroundColor: pal.bg,
                        borderColor: pal.border,
                        color: pal.text,
                      }}
                    >
                      <span className="text-lg font-black">{table.label}</span>
                      <div className="flex items-center gap-1 opacity-60 text-[10px]">
                        <Users size={10} />
                        <span>{table.capacity}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : (
            /* Tablet/Desktop: Full Layout */
            <div className="flex min-h-full min-w-full p-4 overflow-visible">
              <div
                className="m-auto relative shadow-2xl transition-all duration-300 flex-shrink-0"
                style={{
                  width: effectiveCols * CELL_SIZE * layoutZoom,
                  height: effectiveRows * CELL_SIZE * layoutZoom,
                  background: "#fffaf6",
                  borderRadius: 16 * layoutZoom,
                  backgroundImage:
                    "radial-gradient(circle, #d4bfa8 1px, transparent 1px)",
                  backgroundSize: `${CELL_SIZE * layoutZoom}px ${
                    CELL_SIZE * layoutZoom
                  }px`,
                }}
              >
                {/* Fixtures */}
                {fixtures.map((fixture) => {
                  const entry = (CATALOG_BY_TYPE as any)[fixture.type];
                  if (!entry) return null;
                  return (
                    <div
                      key={fixture.id}
                      className="absolute flex items-center justify-center select-none opacity-60 pointer-events-none"
                      style={{
                        left: (fixture.gridCol - 1) * CELL_SIZE * layoutZoom,
                        top: (fixture.gridRow - 1) * CELL_SIZE * layoutZoom,
                        width:
                          (fixture.rotation === 90 || fixture.rotation === 270
                            ? fixture.rowSpan
                            : fixture.colSpan) *
                          CELL_SIZE *
                          layoutZoom,
                        height:
                          (fixture.rotation === 90 || fixture.rotation === 270
                            ? fixture.colSpan
                            : fixture.rowSpan) *
                          CELL_SIZE *
                          layoutZoom,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center w-full h-full overflow-hidden"
                        style={{
                          background: entry.isTransparent
                            ? "transparent"
                            : entry.bg,
                          border: entry.isTransparent
                            ? "none"
                            : `1.5px solid ${entry.border}`,
                          borderRadius: entry.isWall ? 0 : 8 * layoutZoom,
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {!entry.isWall && (
                            <FixtureIcon
                              type={fixture.type}
                              size={16 * layoutZoom}
                              color={entry.textColor}
                            />
                          )}
                          {fixture.label && (
                            <span
                              className="px-1 text-center font-bold break-words w-full"
                              style={{
                                color: entry.textColor,
                                fontSize: 10 * layoutZoom,
                              }}
                            >
                              {fixture.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Tables */}
                {tables
                  .filter((t) => t.isActive)
                  .map((table) => {
                    const pal = paletteFor(table.section);
                    const rotation = table.rotation ?? 0;
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          const onlyNumber = table.label
                            .replace(/mesa\s*/i, "")
                            .trim();
                          onSelectTable(onlyNumber);
                        }}
                        className="absolute flex items-center justify-center select-none group transition-transform active:scale-95 cursor-pointer hover:z-20"
                        style={{
                          left:
                            (table.gridCol - 1) * CELL_SIZE * layoutZoom +
                            3 * layoutZoom,
                          top:
                            (table.gridRow - 1) * CELL_SIZE * layoutZoom +
                            3 * layoutZoom,
                          width: table.colSpan * CELL_SIZE * layoutZoom - 6 * layoutZoom,
                          height:
                            table.rowSpan * CELL_SIZE * layoutZoom - 6 * layoutZoom,
                          zIndex: 10,
                        }}
                      >
                        <div
                          className="flex flex-col items-center justify-center w-full h-full overflow-hidden group-hover:brightness-95 transition-all shadow-md"
                          style={{
                            background: pal.bg,
                            border: `2px solid ${pal.border}`,
                            borderRadius: table.shape === "circular" ? "999px" : 8 * layoutZoom,
                            transform: `rotate(${rotation}deg)`,
                          }}
                        >
                          <div
                            className="flex flex-col items-center justify-center"
                            style={{ transform: `rotate(${-rotation}deg)` }}
                          >
                            <span
                              className="font-black text-center leading-none"
                              style={{
                                fontSize: Math.max(10, (table.label.length > 3 ? 12 : 14) * layoutZoom),
                                color: pal.text,
                                fontFamily: "var(--font-epilogue, serif)",
                              }}
                            >
                              {table.label}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5 opacity-50">
                              <Users size={10 * layoutZoom} style={{ color: pal.text }} />
                              <span className="font-bold" style={{ color: pal.text, fontSize: 9 * layoutZoom }}>
                                {table.capacity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
        {/* Zoom hint */}
        <div className="bg-white border-t px-4 py-3 flex items-center justify-center text-xs text-slate-500 font-semibold uppercase tracking-widest gap-2 shrink-0">
          <Map size={14} /> Selecciona una mesa para tomar su pedido
        </div>
      </div>
    </div>
  );
}
