"use client";

import { Save, Plus, ZoomIn, ZoomOut, Map, LayoutGrid, RotateCcw, X, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatPill } from "@/components/salon/SalonSharedUI";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";

interface TableManagerHeaderProps {
  editMode: "tables" | "space";
  setEditMode: (m: "tables" | "space") => void;
  isDirty: boolean;
  fixtureIsDirty: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  gridCols: number;
  gridRows: number;
  setGridSize: (cols: number, rows: number) => void;
  activeTables: RestaurantTable[];
  sections: string[];
  tables: RestaurantTable[];
  isSavingLayout: boolean;
  onSaveLayout: () => void;
  openCreate: () => void;
}

export function TableManagerHeader({
  editMode,
  setEditMode,
  isDirty,
  fixtureIsDirty,
  zoom,
  onZoomChange,
  gridCols,
  gridRows,
  setGridSize,
  activeTables,
  sections,
  tables,
  isSavingLayout,
  onSaveLayout,
  openCreate,
}: TableManagerHeaderProps) {
  const needsSave = isDirty || fixtureIsDirty;

  // Colors
  const outlineVariant = "#e9e2d9";
  const surfaceLow = "#f5ece0";
  const ink = "#251a07";
  const red = "#bb0005";
  const redContainer = "#9a0004";

  return (
    <header
      className="flex shrink-0 items-center justify-between px-6 py-3 z-20"
      style={{
        background: "rgba(255,248,243,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${outlineVariant}`,
      }}
    >
      <div className="flex items-center gap-4">
        <div>
          <h1
            className="text-2xl font-black leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-epilogue, 'Epilogue', serif)",
              color: ink,
            }}
          >
            Salón
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#9a7a5a" }}>
            {activeTables.length} mesas activas · {activeTables.reduce((s, t) => s + (t.capacity || 0), 0)} cubiertos
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="hidden md:flex items-center rounded-xl border p-1 ml-4" style={{ borderColor: outlineVariant, background: surfaceLow }}>
          <button
            onClick={() => setEditMode("tables")}
            className="px-4 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{
              background: editMode === "tables" ? "#fff" : "transparent",
              color: editMode === "tables" ? red : "#9a7a5a",
              boxShadow: editMode === "tables" ? `0 2px 8px rgba(37,26,7,0.06)` : "none",
            }}
          >
            Mesas
          </button>
          <button
            onClick={() => setEditMode("space")}
            className="px-4 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{
              background: editMode === "space" ? "#fff" : "transparent",
              color: editMode === "space" ? red : "#9a7a5a",
              boxShadow: editMode === "space" ? `0 2px 8px rgba(37,26,7,0.06)` : "none",
            }}
          >
            Espacios
          </button>
        </div>

        {/* Dirty indicator */}
        {(isDirty || fixtureIsDirty) && (
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "#fff1f2", color: red }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            Sin guardar
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Stats — desktop only */}
        <div className="hidden lg:flex items-center gap-2 mr-2">
          <StatPill label="Total" value={tables.length} />
          <StatPill label="Secciones" value={sections.length} />
        </div>

        {/* Zoom */}
        <div
          className="flex items-center rounded-full border px-1"
          style={{ borderColor: outlineVariant, background: surfaceLow }}
        >
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white"
            onClick={() => onZoomChange(Math.max(0.4, +(zoom - 0.1).toFixed(1)))}
            title="Alejar (−)"
          >
            <ZoomOut size={14} style={{ color: ink }} />
          </button>
          <span className="w-10 text-center text-xs font-bold tabular-nums" style={{ color: ink }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white"
            onClick={() => onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)))}
            title="Acercar (+)"
          >
            <ZoomIn size={14} style={{ color: ink }} />
          </button>
        </div>
        
        {/* Grid Dimensions */}
        <div
          className="flex items-center gap-3 rounded-full border px-3 py-1"
          style={{ borderColor: outlineVariant, background: surfaceLow }}
        >
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Ancho</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setGridSize(Math.max(10, gridCols - 1), gridRows)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={10} className="rotate-45" />
              </button>
              <span className="text-xs font-bold w-4 text-center tabular-nums">{gridCols}</span>
              <button 
                onClick={() => setGridSize(Math.min(100, gridCols + 1), gridRows)}
                className="hover:text-green-600 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
          
          <div className="w-px h-6" style={{ background: outlineVariant }} />

          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Alto</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setGridSize(gridCols, Math.max(10, gridRows - 1))}
                className="hover:text-red-500 transition-colors"
              >
                <X size={10} className="rotate-45" />
              </button>
              <span className="text-xs font-bold w-4 text-center tabular-nums">{gridRows}</span>
              <button 
                onClick={() => setGridSize(gridCols, Math.min(100, gridRows + 1))}
                className="hover:text-green-600 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all"
          style={{
            background: surfaceLow,
            color: ink,
            border: `1px solid ${outlineVariant}`,
          }}
          onClick={() => window.open("/api/admin/tables/qr-sheet", "_blank")}
        >
          <Printer size={15} />
          <span className="hidden sm:inline">Imprimir QRs</span>
        </button>

        <button
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background: needsSave
              ? `linear-gradient(15deg, ${red}, ${redContainer})`
              : surfaceLow,
            color: needsSave ? "#fff" : "#9a7a5a",
            boxShadow: needsSave ? `0 4px 24px rgba(187,0,5,0.25)` : "none",
            cursor: needsSave ? "pointer" : "default",
          }}
          onClick={onSaveLayout}
          disabled={!needsSave || isSavingLayout}
        >
          {isSavingLayout ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          <span className="hidden sm:inline">Guardar Layout</span>
        </button>
      </div>
    </header>
  );
}
