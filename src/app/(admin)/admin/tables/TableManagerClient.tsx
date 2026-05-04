"use client";

/**
 * TableManagerClient — Heritage Editorial Design System
 *
 * Fonts required in app layout (add to src/app/layout.tsx):
 *   import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
 *   const epilogue = Epilogue({ subsets: ["latin"], variable: "--font-epilogue" });
 *   const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
 *   <body className={`${epilogue.variable} ${jakarta.variable}`}>
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Save, Printer, Trash2, Edit2, ZoomIn, ZoomOut,
  RefreshCw, Users, Download, LayoutGrid, Map, X, ChevronRight, Wifi, QrCode,
  AlertTriangle, CheckCircle2, RotateCcw, GripVertical, Layers,
  SeparatorHorizontal,
} from "lucide-react";
import type { RestaurantTable, NewRestaurantTable } from "@/db/schema/restaurant-tables";
import {
  createTableAction, updateTableAction, deleteTableAction,
  saveTableLayoutAction, regenerateTokenAction,
  updateGridSizeAction,
  saveTableSortOrderAction,
} from "@/actions/restaurant-tables";
import { TableRotation, TableShape } from "@/lib/salon-types";
import { CELL_SIZE } from "@/lib/salon-constants";
import {
  FixtureIcon,
  ShapeIcon,
} from "@/components/salon/SalonSharedUI";
import {
  createFixtureAction, updateFixtureAction, deleteFixtureAction,
  saveFixtureLayoutAction,
} from "@/actions/floor-fixtures";
import { updateTablesZoomAction } from "@/actions/settings";
import type { SystemSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TablePosition, FixturePosition } from "@/store/tableLayoutStore";

import { FIXTURE_CATALOG, CATALOG_BY_TYPE } from "@/lib/fixture-catalog";
import type { FloorFixture, FixtureType } from "@/db/schema/floor-fixtures";
import { useTableLayoutStore } from "@/store/tableLayoutStore";
import { useFixtureLayoutStore } from "@/store/fixtureLayoutStore";
import { useZoomPersist } from "@/hooks/useZoomPersist";
import { useFixtureCRUD } from "@/hooks/useFixtureCRUD";
import { useTableCRUD } from "@/hooks/useTableCRUD";
import { useSalonDrag } from "@/hooks/useSalonDrag";
import { useListReorder } from "@/hooks/useListReorder";
import { TableManagerHeader } from "@/components/admin/TableManagerHeader";
import { SidebarPanel } from "@/components/admin/SidebarPanel";
import { FloorCanvas } from "@/components/admin/FloorCanvas";
import { TableFormModal } from "@/components/admin/modals/TableFormModal";
import { QrPreviewModal } from "@/components/admin/modals/QrPreviewModal";
import { ConfirmDeleteModal } from "@/components/admin/modals/ConfirmDeleteModal";
import { ConfirmRegenModal } from "@/components/admin/modals/ConfirmRegenModal";


// ── Main Component ────────────────────────────────────────────────────────────

export function TableManagerClient({
  initialTables,
  initialFixtures,
  initialSettings,
}: {
  initialTables: RestaurantTable[];
  initialFixtures: FloorFixture[];
  initialSettings: SystemSettings | null;
}) {
  const router = useRouter();
  const { 
    positions, isDirty, gridCols, gridRows,
    setPositions, addPositions, updatePosition, resetDirty, setGridSize 
  } = useTableLayoutStore();

  const {
    positions: fixturePositions,
    isDirty: fixtureIsDirty,
    setPositions: setFixturePositions,
    addPositions: addFixturePositions,
    updatePosition: updateFixturePosition,
    removePosition: removeFixturePosition,
    resetDirty: resetFixtureDirty,
  } = useFixtureLayoutStore();

  type EditMode = "tables" | "space";
  const [editMode, setEditMode] = useState<EditMode>("tables");
  
  const handleSetEditMode = (mode: EditMode) => {
    setEditMode(mode);
    if (mode === "tables") setSelectedFixtureId(null);
    else setSelectedId(null);
  };
  const [activePanel, setActivePanel] = useState<"plan" | "list">("plan");

  const [fixtures, setFixtures] = useState<FloorFixture[]>(initialFixtures);
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  
  const floorRef = useRef<HTMLDivElement>(null);

  // Derived state
  const sections = Array.from(new Set(tables.map((t) => t.section ?? "Principal"))).sort();
  const activeTables = tables.filter((t) => t.isActive);
  const visibleTables = tables.filter(
    (t) => activeSection === "all" || (t.section ?? "Principal") === activeSection
  );

// ── Hooks ──────────────────────────────────────────────────────────────────
  const { zoom, handleZoomChange } = useZoomPersist(initialSettings?.tablesDefaultZoom ? initialSettings.tablesDefaultZoom / 100 : 0.9);
  
  const {
    selectedFixtureId,
    setSelectedFixtureId,
    handleDeleteFixture,
  } = useFixtureCRUD({ setFixtures, removeFixturePosition });

  const {
    isModalOpen, setIsModalOpen,
    editingTable, setEditingTable,
    confirmDelete, setConfirmDelete,
    confirmRegen, setConfirmRegen,
    qrPreviewId, setQrPreviewId,
    rotations, setRotations,
    openCreate,
    rotateTable,
    handleDelete,
    handleRegenToken,
  } = useTableCRUD({
    tables, setTables, positions, updatePosition, 
    gridCols, gridRows, activeSection 
  });

  const {
    draggingId, resizingId,
    startDrag, startFixtureDrag, startFixtureResize,
    onFloorPointerMove, onFloorPointerUp,
  } = useSalonDrag({
    positions, fixturePositions, zoom, gridCols, gridRows,
    editMode, floorRef, updatePosition, updateFixturePosition,
    setSelectedId, setSelectedFixtureId
  });

  const {
    draggedIdx, dragOverIdx,
    handleListDragStart, handleListDragOver,
    handleListDragEnd, handleListDrop,
  } = useListReorder({ visibleTables, tables, setTables });

  // ── Sync effects ──────────────────────────────────────────────────────────

  // Sync grid from settings
  useEffect(() => {
    if (initialSettings) {
      setGridSize(initialSettings.tablesGridCols ?? 20, initialSettings.tablesGridRows ?? 14);
    }
  }, [initialSettings, setGridSize]);

  // Sync tables from server
  useEffect(() => {
    setTables(initialTables);
    const serverPos = initialTables.map(t => ({
      id: t.id, gridCol: t.gridCol, gridRow: t.gridRow, colSpan: t.colSpan, rowSpan: t.rowSpan,
    }));
    if (!isDirty) {
      setPositions(serverPos);
      const r: Record<string, TableRotation> = {};
      initialTables.forEach(t => { r[t.id] = (t.rotation ?? 0) as TableRotation; });
      setRotations(r);
    }
  }, [initialTables, isDirty, setPositions, addPositions, setRotations, positions]);

  // Sync fixtures from server
  useEffect(() => {
    setFixtures(initialFixtures);
    const serverPos = initialFixtures.map(f => ({
      id: f.id, gridCol: f.gridCol, gridRow: f.gridRow, colSpan: f.colSpan, rowSpan: f.rowSpan, rotation: f.rotation,
    }));
    if (!fixtureIsDirty) {
      setFixturePositions(serverPos);
    } else {
      const currentIds = new Set(Object.keys(fixturePositions));
      const missing = serverPos.filter(p => !currentIds.has(p.id));
      if (missing.length > 0) addFixturePositions(missing);
    }
  }, [initialFixtures, fixtureIsDirty, setFixturePositions, addFixturePositions, fixturePositions]);

  // Keyboard zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "=" || e.key === "+") handleZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)));
      if (e.key === "-") handleZoomChange(Math.max(0.4, +(zoom - 0.1).toFixed(1)));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoom, handleZoomChange]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
      if (gridCols !== (initialSettings?.tablesGridCols ?? 20) || gridRows !== (initialSettings?.tablesGridRows ?? 14)) {
        await updateGridSizeAction({ cols: gridCols, rows: gridRows });
      }
      if (isDirty) {
        const updates = Object.values(positions).map(p => ({ ...p, rotation: rotations[p.id] ?? 0 }));
        const res = await saveTableLayoutAction({ updates });
        if (res?.data?.success) resetDirty();
        else toast.error(res?.serverError ?? "Error al guardar mesas");
      }
      if (fixtureIsDirty) {
        const fixtureUpdates = Object.values(fixturePositions).map(p => ({
          id: p.id, gridCol: p.gridCol, gridRow: p.gridRow, colSpan: p.colSpan, rowSpan: p.rowSpan,
          rotation: (p.rotation ?? 0) as 0 | 90 | 180 | 270,
        }));
        const res = await saveFixtureLayoutAction({ updates: fixtureUpdates });
        if (res?.data?.success) resetFixtureDirty();
        else toast.error(res?.serverError ?? "Error al guardar espacios");
      }
      toast.success("Diseño guardado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    const labelVal = editingTable.label?.trim() ?? "";
    const isDup = labelVal.length > 0 && tables.some(
      (t) => t.id !== editingTable.id && t.label.trim().toLowerCase() === labelVal.toLowerCase()
    );
    if (isDup) {
      toast.error(`Ya existe una mesa llamada "${labelVal}"`);
      return;
    }

    const isEdit = !!editingTable.id;
    try {
      if (isDirty) {
        const updates = Object.values(positions);
        await saveTableLayoutAction({ updates });
        resetDirty();
      }

      if (isEdit) {
        const result = await updateTableAction({
          id: editingTable.id!,
          label: editingTable.label!,
          section: editingTable.section,
          capacity: editingTable.capacity!,
          shape: editingTable.shape!,
          rotation: editingTable.rotation ?? 0,
          gridCol: editingTable.gridCol!,
          gridRow: editingTable.gridRow!,
          colSpan: editingTable.colSpan!,
          rowSpan: editingTable.rowSpan!,
          isActive: editingTable.isActive,
        });
        if (result?.data?.success) {
          const updated = result.data.table as RestaurantTable;
          setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setRotations((prev) => ({ ...prev, [updated.id]: (updated.rotation ?? 0) as TableRotation }));
          toast.success("Mesa actualizada");
          setIsModalOpen(false);
        }
      } else {
        const result = await createTableAction({
          label: editingTable.label!,
          section: editingTable.section,
          capacity: editingTable.capacity!,
          shape: editingTable.shape!,
          rotation: editingTable.rotation ?? 0,
          gridCol: editingTable.gridCol!,
          gridRow: editingTable.gridRow!,
          colSpan: editingTable.colSpan!,
          rowSpan: editingTable.rowSpan!,
          isActive: editingTable.isActive,
        });
        if (result?.data?.success) {
          const created = result.data.table as RestaurantTable;
          setTables((prev) => [...prev, created]);
          setRotations((prev) => ({ ...prev, [created.id]: (created.rotation ?? 0) as TableRotation }));
          setPositions([
            ...Object.values(positions),
            {
              id: created.id,
              gridCol: created.gridCol,
              gridRow: created.gridRow,
              colSpan: created.colSpan,
              rowSpan: created.rowSpan,
            },
          ]);
          toast.success("Mesa creada");
          setIsModalOpen(false);
        }
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleTemplateDragStart = (e: React.DragEvent, shape: TableShape) => {
    e.dataTransfer.setData("application/table-shape", shape);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleFixtureDragStart = (e: React.DragEvent, type: FixtureType) => {
    e.dataTransfer.setData("application/fixture-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onFloorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onFloorDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const shape = e.dataTransfer.getData("application/table-shape") as TableShape;
    const fixtureType = e.dataTransfer.getData("application/fixture-type") as FixtureType;

    if (!shape && !fixtureType) return;

    const rect = floorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const effectiveCell = CELL_SIZE * zoom;
    const gridCol = Math.max(1, Math.min(gridCols, Math.floor(x / effectiveCell) + 1));
    const gridRow = Math.max(1, Math.min(gridRows, Math.floor(y / effectiveCell) + 1));

    if (fixtureType) {
      const entry = CATALOG_BY_TYPE[fixtureType];
      if (!entry) return;
      try {
        const result = await createFixtureAction({
          type: fixtureType, label: null, gridCol, gridRow,
          colSpan: entry.defaultColSpan, rowSpan: entry.defaultRowSpan, rotation: 0,
        });
        if (result?.data?.success) {
          const created = result.data.fixture as FloorFixture;
          setFixtures((p) => [...p, created]);
          addFixturePositions([{
            id: created.id, gridCol, gridRow, colSpan: created.colSpan, rowSpan: created.rowSpan, rotation: 0,
          }]);
          setSelectedFixtureId(created.id);
          toast.success(`${entry.label} agregado`);
        } else {
          toast.error(result?.serverError || "Error al crear elemento");
        }
      } catch {
        toast.error("Error de conexión");
      }
      return;
    }

    if (shape) {
      setEditingTable({
        label: `Mesa ${tables.length + 1}`,
        section: activeSection === "all" ? "Principal" : activeSection,
        capacity: 4, shape, gridCol, gridRow, rotation: 0,
        colSpan: shape === "rectangular" ? 3 : 2, rowSpan: 2,
        isActive: true,
      });
      setIsModalOpen(true);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-[#fff8f3] font-jakarta text-[#251a07]">
      <TableManagerHeader
        editMode={editMode}
        setEditMode={handleSetEditMode}
        isDirty={isDirty}
        fixtureIsDirty={fixtureIsDirty}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        gridCols={gridCols}
        gridRows={gridRows}
        setGridSize={setGridSize}
        activeTables={activeTables}
        sections={sections}
        tables={tables}
        isSavingLayout={isSavingLayout}
        onSaveLayout={handleSaveLayout}
        openCreate={openCreate}
      />

      {/* ── Mobile tab bar ── */}
      <div
        className="flex shrink-0 lg:hidden"
        style={{ borderBottom: `1px solid #e9e2d9` }}
      >
        {(["plan", "list"] as const).map((tab) => (
          <button
            key={tab}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
            style={{
              color: activePanel === tab ? "#bb0005" : "#9a7a5a",
              borderBottom: activePanel === tab ? `2px solid #bb0005` : "2px solid transparent",
              background: "#fffcf9",
            }}
            onClick={() => setActivePanel(tab)}
          >
            {tab === "plan" ? <Map size={16} /> : <LayoutGrid size={16} />}
            {tab === "plan" ? "Plano" : "Mesas"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Floor plan ── */}
        <div
          className={cn(
            "flex flex-col overflow-hidden flex-1",
            activePanel !== "plan" && "hidden lg:flex"
          )}
        >
          <FloorCanvas
            ref={floorRef}
            tables={tables}
            fixtures={fixtures}
            positions={positions}
            fixturePositions={fixturePositions}
            rotations={rotations}
            zoom={zoom}
            gridCols={gridCols}
            gridRows={gridRows}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            sections={sections}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedFixtureId={selectedFixtureId}
            setSelectedFixtureId={setSelectedFixtureId}
            editMode={editMode}
            draggingId={draggingId}
            resizingId={resizingId}
            onPointerMove={onFloorPointerMove}
            onPointerUp={onFloorPointerUp}
            onDragOver={onFloorDragOver}
            onDrop={onFloorDrop}
            onTablePointerDown={startDrag}
            onTableRotate={rotateTable}
            onFixturePointerDown={startFixtureDrag}
            onFixtureDelete={handleDeleteFixture}
            onFixtureResizeStart={startFixtureResize}
            onFixtureLabelChange={async (id, label) => {
              setFixtures(p => p.map(f => f.id === id ? { ...f, label } : f));
              await updateFixtureAction({ id, label });
            }}
            onFixtureRotate={(id) => {
              const pos = fixturePositions[id];
              if (pos) updateFixturePosition(id, { rotation: ((pos.rotation + 90) % 360) as 0|90|180|270 });
            }}
          />
        </div>

        <SidebarPanel
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sections={sections}
          tables={tables}
          visibleTables={visibleTables}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          draggedIdx={draggedIdx}
          dragOverIdx={dragOverIdx}
          onDragStart={handleListDragStart}
          onDragOver={handleListDragOver}
          onDragEnd={handleListDragEnd}
          onDrop={handleListDrop}
          onEdit={(t) => { setEditingTable({ ...t, rotation: (t.rotation ?? 0) as TableRotation }); setIsModalOpen(true); }}
          onDelete={setConfirmDelete}
          onQrPreview={setQrPreviewId}
          editMode={editMode}
          selectedFixtureId={selectedFixtureId}
          handleTemplateDragStart={handleTemplateDragStart}
          handleFixtureDragStart={handleFixtureDragStart}
          openCreate={openCreate}
          activePanel={activePanel}
        />
      </div>

      {/* Modals */}
      <TableFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingTable={editingTable}
        setEditingTable={setEditingTable}
        onSubmit={handleSaveTable}
        tables={tables}
        gridCols={gridCols}
        gridRows={gridRows}
      />
      
      <QrPreviewModal
        tableId={qrPreviewId}
        tableName={tables.find(t => t.id === qrPreviewId)?.label}
        onClose={() => setQrPreviewId(null)}
        onRegen={setConfirmRegen}
      />

      <ConfirmDeleteModal
        tableLabel={tables.find(t => t.id === confirmDelete)?.label}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmRegenModal
        tableLabel={tables.find(t => t.id === confirmRegen)?.label}
        onConfirm={() => confirmRegen && handleRegenToken(confirmRegen)}
        onCancel={() => setConfirmRegen(null)}
      />
    </div>
  );
}