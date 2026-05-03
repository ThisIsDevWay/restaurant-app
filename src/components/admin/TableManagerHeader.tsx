"use client";

import { Save, Plus, ZoomIn, ZoomOut, Map, LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <header className="flex shrink-0 flex-col gap-4 border-b border-[#e9e2d9] bg-[#fff8f3] px-6 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#251a07] text-white shadow-lg">
          <Map size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-[#251a07]">
            Gestión de Salón
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-[#9a7a5a]">
            Editor de Distribución y Espacios
          </p>
        </div>
      </div>

      {/* Stats - Desktop */}
      <div className="hidden items-center gap-2 xl:flex">
        <StatPill label="Mesas" value={tables.length} />
        <StatPill label="Activas" value={activeTables.length} />
        <StatPill label="Secciones" value={sections.length} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle Mode */}
        <div className="flex rounded-2xl bg-[#f5ece0] p-1.5 shadow-inner">
          <button
            onClick={() => setEditMode("tables")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              editMode === "tables"
                ? "bg-[#251a07] text-white shadow-md"
                : "text-[#9a7a5a] hover:bg-white/50"
            }`}
          >
            <LayoutGrid size={14} />
            MESAS
          </button>
          <button
            onClick={() => setEditMode("space")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              editMode === "space"
                ? "bg-[#251a07] text-white shadow-md"
                : "text-[#9a7a5a] hover:bg-white/50"
            }`}
          >
            <RotateCcw size={14} />
            ESPACIOS
          </button>
        </div>

        {/* Grid Size */}
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-[#e9e2d9]">
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] font-black uppercase text-[#9a7a5a]">Cols</Label>
            <Input
              type="number"
              className="h-7 w-12 rounded-lg border-none bg-[#f5ece0] text-center text-xs font-bold focus:ring-1 focus:ring-[#bb0005]"
              value={gridCols}
              onChange={(e) => setGridSize(parseInt(e.target.value) || 10, gridRows)}
            />
          </div>
          <div className="h-4 w-px bg-[#e9e2d9]" />
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] font-black uppercase text-[#9a7a5a]">Filas</Label>
            <Input
              type="number"
              className="h-7 w-12 rounded-lg border-none bg-[#f5ece0] text-center text-xs font-bold focus:ring-1 focus:ring-[#bb0005]"
              value={gridRows}
              onChange={(e) => setGridSize(gridCols, parseInt(e.target.value) || 10)}
            />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#e9e2d9]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-[#9a7a5a] hover:bg-[#fff2e2]"
            onClick={() => onZoomChange(Math.max(0.4, +(zoom - 0.1).toFixed(1)))}
          >
            <ZoomOut size={16} />
          </Button>
          <span className="min-w-[3rem] text-center text-[10px] font-black text-[#251a07]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-[#9a7a5a] hover:bg-[#fff2e2]"
            onClick={() => onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)))}
          >
            <ZoomIn size={16} />
          </Button>
        </div>

        {/* Save Button */}
        <Button
          onClick={onSaveLayout}
          disabled={!needsSave || isSavingLayout}
          className={`h-11 rounded-2xl px-6 font-black shadow-lg transition-all ${
            needsSave
              ? "bg-[#bb0005] text-white hover:bg-[#9a0004] hover:shadow-xl hover:-translate-y-0.5"
              : "bg-[#e9e2d9] text-[#9a7a5a]"
          }`}
        >
          {isSavingLayout ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <Save size={18} className="mr-2" />
              GUARDAR LAYOUT
            </>
          )}
        </Button>

        {/* Add Table Button */}
        <Button
          onClick={openCreate}
          className="h-11 w-11 rounded-2xl bg-[#251a07] p-0 text-white shadow-lg hover:bg-[#3d2c0d] hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus size={24} />
        </Button>
      </div>
    </header>
  );
}
