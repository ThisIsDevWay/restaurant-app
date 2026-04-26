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
  RefreshCw, Users, Square, Circle, RectangleHorizontal,
  Download, LayoutGrid, Map, X, ChevronRight, Wifi, QrCode,
  AlertTriangle, CheckCircle2, RotateCcw, GripVertical, Layers,
  Minus, DoorOpen, AppWindow, GlassWater, ChefHat, CreditCard,
  ArrowUpDown, Toilet, User, UserRound, Leaf, SeparatorHorizontal,
  Type, Circle as CircleIcon,
} from "lucide-react";
import type { RestaurantTable, NewRestaurantTable } from "@/db/schema/restaurant-tables";
import {
  createTableAction, updateTableAction, deleteTableAction,
  saveTableLayoutAction, regenerateTokenAction,
  updateGridSizeAction,
  saveTableSortOrderAction,
} from "@/actions/restaurant-tables";
import {
  createFixtureAction, updateFixtureAction, deleteFixtureAction,
  saveFixtureLayoutAction,
} from "@/actions/floor-fixtures";
import { updateTablesZoomAction } from "@/actions/settings";
import { useTableLayoutStore } from "@/store/tableLayoutStore";
import { useFixtureLayoutStore } from "@/store/fixtureLayoutStore";
import { FIXTURE_CATALOG, CATALOG_BY_TYPE } from "@/lib/fixture-catalog";
import type { FloorFixture, FixtureType } from "@/db/schema/floor-fixtures";
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

// ── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 44;
const DRAG_THRESHOLD_PX = 4; // pixels before a click becomes a drag

const SECTIONS = ["Principal", "Terraza", "VIP", "Barra", "Exterior"] as const;
type Section = (typeof SECTIONS)[number];

// Heritage Editorial palette per section
const SECTION_PALETTE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Principal: { bg: "#fff2e2", border: "#e9a87c", text: "#5a2a00", dot: "#e9a87c" },
  Terraza: { bg: "#f0fdf4", border: "#6cc08a", text: "#14532d", dot: "#6cc08a" },
  VIP: { bg: "#faf5ff", border: "#c084fc", text: "#581c87", dot: "#c084fc" },
  Barra: { bg: "#fff1f2", border: "#e2231a", text: "#881337", dot: "#e2231a" },
  Exterior: { bg: "#f0f9ff", border: "#38bdf8", text: "#0c4a6e", dot: "#38bdf8" },
};

function paletteFor(section: string | null | undefined) {
  return SECTION_PALETTE[section ?? "Principal"] ?? SECTION_PALETTE.Principal;
}

// ── Types ────────────────────────────────────────────────────────────────────

type TableShape = "cuadrada" | "rectangular" | "circular";
type TableRotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
type EditingTable = Partial<RestaurantTable> & { shape?: TableShape; rotation?: TableRotation };

interface DragState {
  id: string;
  el: HTMLElement;       // the DOM node being dragged
  startX: number;        // pointer clientX at drag start
  startY: number;        // pointer clientY at drag start
  origCol: number;
  origRow: number;
  currentCol: number;    // live column during drag (no re-render)
  currentRow: number;    // live row during drag
  didMove: boolean;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ShapeIcon({ shape, size = 14 }: { shape?: TableShape; size?: number }) {
  if (shape === "circular") return <Circle size={size} />;
  if (shape === "rectangular") return <RectangleHorizontal size={size} />;
  return <Square size={size} />;
}

function SectionDot({ section }: { section: string | null | undefined }) {
  const p = paletteFor(section);
  return (
    <span
      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: p.dot }}
    />
  );
}

function FixtureIcon({ type, size, color }: { type: FixtureType; size: number; color: string }) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (type) {
    case "wall_h": case "wall_v": case "divider": return <Minus {...props} />;
    case "door": case "door_double": return <DoorOpen {...props} />;
    case "window":      return <AppWindow {...props} />;
    case "bar_counter": return <GlassWater {...props} />;
    case "kitchen_pass": return <ChefHat {...props} />;
    case "cashier":     return <CreditCard {...props} />;
    case "column":      return <CircleIcon {...props} />;
    case "stairs":      return <ArrowUpDown {...props} />;
    case "bathroom":    return <Toilet {...props} />;
    case "bathroom_m":  return <User {...props} />;
    case "bathroom_f":  return <UserRound {...props} />;
    case "plant":       return <Leaf {...props} />;
    case "text_label":  return <Type {...props} />;
    default:            return null;
  }
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl px-4 py-2"
      style={{ background: "#fff2e2" }}>
      <span className="text-xl font-black tabular-nums" style={{ color: "#bb0005", fontFamily: "var(--font-epilogue, serif)" }}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "#9a7a5a" }}>
        {label}
      </span>
    </div>
  );
}

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
  const [fixtures, setFixtures] = useState<FloorFixture[]>(initialFixtures);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [fixtureIsSavingLayout, setFixtureIsSavingLayout] = useState(false);

  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EditingTable | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [qrPreviewId, setQrPreviewId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"plan" | "list">("plan");

  const floorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const fixtureDragRef = useRef<DragState | null>(null);
  // Track which id is actively being dragged (for cursor style only)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeRef = useRef<{
    id: string;
    origColSpan: number;
    origRowSpan: number;
    startX: number;
    startY: number;
  } | null>(null);
  // Rotation state per table id (local, pending until "Guardar Layout")
  const [rotations, setRotations] = useState<Record<string, TableRotation>>({});
  // Reorder state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Sync settings and grid
  useEffect(() => {
    if (initialSettings) {
      setGridSize(initialSettings.tablesGridCols ?? 20, initialSettings.tablesGridRows ?? 14);
      if (initialSettings.tablesDefaultZoom) {
        setZoom(initialSettings.tablesDefaultZoom / 100);
      }
    }
  }, [initialSettings, setGridSize]);

  // Save zoom change to settings (debounced)
  const saveZoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const saveZoom = useCallback((newZoom: number) => {
    if (saveZoomTimeoutRef.current) {
      clearTimeout(saveZoomTimeoutRef.current);
    }

    saveZoomTimeoutRef.current = setTimeout(async () => {
      const zoomPct = Math.round(newZoom * 100);
      await updateTablesZoomAction({ zoom: zoomPct });
    }, 1000); // 1 second debounce
  }, []);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    saveZoom(newZoom);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveZoomTimeoutRef.current) {
        clearTimeout(saveZoomTimeoutRef.current);
      }
    };
  }, []);

  // Sync rotations from server data (only on clean load)
  useEffect(() => {
    if (!isDirty) {
      const r: Record<string, TableRotation> = {};
      initialTables.forEach((t) => {
        const rot = (t.rotation ?? 0) as TableRotation;
        r[t.id] = rot;
      });
      setRotations(r);
    }
  }, [initialTables, isDirty]);

  // Sync positions from server data
  useEffect(() => {
    setTables(initialTables);

    const serverPositions = initialTables.map((t) => ({
      id: t.id,
      gridCol: t.gridCol,
      gridRow: t.gridRow,
      colSpan: t.colSpan,
      rowSpan: t.rowSpan,
    }));

    // Si no hay cambios locales sin guardar, sincronizamos todo
    if (!isDirty) {
      setPositions(serverPositions);
    } else {
      // Si hay cambios locales, solo agregamos mesas que falten (nuevas creaciones)
      // manteniendo el estado 'isDirty'
      const currentIds = new Set(Object.keys(positions));
      const missing = serverPositions.filter((p) => !currentIds.has(p.id));
      if (missing.length > 0) {
        addPositions(missing);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTables, setPositions, addPositions, isDirty]);

  // Sync fixture positions from server data
  useEffect(() => {
    setFixtures(initialFixtures);

    const serverPositions = initialFixtures.map((f) => ({
      id: f.id,
      gridCol: f.gridCol,
      gridRow: f.gridRow,
      colSpan: f.colSpan,
      rowSpan: f.rowSpan,
      rotation: f.rotation,
    }));

    if (!fixtureIsDirty) {
      setFixturePositions(serverPositions);
    } else {
      const currentIds = new Set(Object.keys(fixturePositions));
      const missing = serverPositions.filter((p) => !currentIds.has(p.id));
      if (missing.length > 0) {
        addFixturePositions(missing);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFixtures, setFixturePositions, addFixturePositions, fixtureIsDirty]);

  // Keyboard zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)));
      if (e.key === "-") setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const visibleTables = tables.filter(
    (t) => activeSection === "all" || t.section === activeSection
  );
  const selectedTable = tables.find((t) => t.id === selectedId) ?? null;
  const sections = [...new Set(tables.map((t) => t.section ?? "Principal"))];
  const activeTables = tables.filter((t) => t.isActive);

  // ── Pointer drag — handlers live on the FLOOR CONTAINER, not on each table ─

  // Called from each table's onPointerDown to BEGIN a drag
  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (editMode !== "tables") return;
      const pos = positions[id];
      if (!pos) return;
      // Capture on the FLOOR element so moves & up are always received
      floorRef.current?.setPointerCapture(e.pointerId);
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      dragRef.current = {
        id,
        el,
        startX: e.clientX,
        startY: e.clientY,
        origCol: pos.gridCol,
        origRow: pos.gridRow,
        currentCol: pos.gridCol,
        currentRow: pos.gridRow,
        didMove: false,
      };
      setSelectedId(id);
      setDraggingId(id);
    },
    [positions, editMode]
  );

  const startFixtureDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (editMode !== "space") return;
      const pos = fixturePositions[id];
      if (!pos) return;
      floorRef.current?.setPointerCapture(e.pointerId);
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      fixtureDragRef.current = {
        id,
        el,
        startX: e.clientX,
        startY: e.clientY,
        origCol: pos.gridCol,
        origRow: pos.gridRow,
        currentCol: pos.gridCol,
        currentRow: pos.gridRow,
        didMove: false,
      };
      setSelectedFixtureId(id);
      setDraggingId(id);
    },
    [fixturePositions, editMode]
  );

  const startFixtureResize = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (editMode !== "space") return;
      const pos = fixturePositions[id];
      if (!pos) return;
      floorRef.current?.setPointerCapture(e.pointerId);
      e.stopPropagation();
      resizeRef.current = {
        id,
        origColSpan: pos.colSpan,
        origRowSpan: pos.rowSpan,
        startX: e.clientX,
        startY: e.clientY,
      };
      setResizingId(id);
    },
    [fixturePositions, editMode]
  );

  // Floor-level pointermove — runs smoothly, mutates DOM directly
  const onFloorPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const fixtureDrag = fixtureDragRef.current;
      const activeDrag = drag || fixtureDrag;
      const resize = resizeRef.current;
      
      if (!activeDrag && !resize) return;

      // Handle Resize
      if (resize) {
        const dx = e.clientX - resize.startX;
        const dy = e.clientY - resize.startY;
        const effectiveCell = CELL_SIZE * zoom;
        const deltaCol = Math.round(dx / effectiveCell);
        const deltaRow = Math.round(dy / effectiveCell);

        const pos = fixturePositions[resize.id];
        if (!pos) return;

        // If rotated 90 or 270, the visual width is rowSpan and height is colSpan.
        // We swap the deltas to update the correct underlying field.
        const isRotated = pos.rotation === 90 || pos.rotation === 270;
        const finalDeltaCol = isRotated ? deltaRow : deltaCol;
        const finalDeltaRow = isRotated ? deltaCol : deltaRow;

        const newColSpan = Math.max(1, Math.min(resize.origColSpan + finalDeltaCol, gridCols - pos.gridCol + 1));
        const newRowSpan = Math.max(1, Math.min(resize.origRowSpan + finalDeltaRow, gridRows - pos.gridRow + 1));

        if (newColSpan !== pos.colSpan || newRowSpan !== pos.rowSpan) {
          updateFixturePosition(resize.id, { colSpan: newColSpan, rowSpan: newRowSpan });
        }
        return;
      }

      // Handle Drag
      if (activeDrag) {
        const dx = e.clientX - activeDrag.startX;
        const dy = e.clientY - activeDrag.startY;

        if (!activeDrag.didMove && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

        if (!activeDrag.didMove) {
          activeDrag.didMove = true;
          // Lift the element visually
          activeDrag.el.style.zIndex = "50";
          activeDrag.el.style.boxShadow = drag
            ? `0 16px 40px rgba(187,0,5,0.25), 0 4px 12px rgba(0,0,0,0.15)`
            : `0 16px 40px rgba(0,0,0,0.25)`;
          activeDrag.el.style.opacity = "0.92";
          activeDrag.el.style.cursor = "grabbing";
        }

        const effectiveCell = CELL_SIZE * zoom;
        const deltaCol = Math.round(dx / effectiveCell);
        const deltaRow = Math.round(dy / effectiveCell);

        const pos = drag
          ? positions[activeDrag.id]
          : fixturePositions[activeDrag.id];
        if (!pos) return;

        const newCol = Math.max(
          1,
          Math.min(activeDrag.origCol + deltaCol, gridCols - pos.colSpan + 1)
        );
        const newRow = Math.max(
          1,
          Math.min(activeDrag.origRow + deltaRow, gridRows - pos.rowSpan + 1)
        );

        // Move element via CSS transform (no React re-render)
        const pixelDx = (newCol - activeDrag.origCol) * CELL_SIZE * zoom;
        const pixelDy = (newRow - activeDrag.origRow) * CELL_SIZE * zoom;
        activeDrag.el.style.transform = `translate(${pixelDx}px, ${pixelDy}px) scale(1.06)`;

        // Remember grid cell for commit on release
        activeDrag.currentCol = newCol;
        activeDrag.currentRow = newRow;
      }
    },
    [positions, fixturePositions, zoom, gridCols, gridRows, updateFixturePosition]
  );

  // Floor-level pointerup — commit position to store once
  const onFloorPointerUp = useCallback(
    (_e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const fixtureDrag = fixtureDragRef.current;
      const activeDrag = drag || fixtureDrag;
      const resize = resizeRef.current;

      if (!activeDrag && !resize) return;

      if (resize) {
        resizeRef.current = null;
        setResizingId(null);
        return;
      }

      if (activeDrag) {
        // Restore element styles
        activeDrag.el.style.zIndex = "";
        activeDrag.el.style.boxShadow = "";
        activeDrag.el.style.opacity = "";
        activeDrag.el.style.cursor = "";
        activeDrag.el.style.transform = "";

        if (activeDrag.didMove) {
          // Commit the final grid position to the store (single re-render)
          if (drag) {
            updatePosition(activeDrag.id, {
              gridCol: activeDrag.currentCol,
              gridRow: activeDrag.currentRow,
            });
          } else if (fixtureDrag) {
            updateFixturePosition(activeDrag.id, {
              gridCol: activeDrag.currentCol,
              gridRow: activeDrag.currentRow,
            });
          }
        }
      }

      if (drag) dragRef.current = null;
      if (fixtureDrag) fixtureDragRef.current = null;

      setDraggingId(null);
    },
    [updatePosition, updateFixturePosition]
  );

  // ── List reordering (Side Panel) ──────────────────────────────────────────

  const handleListDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    // Visual cue for DND
    e.dataTransfer.effectAllowed = "move";
  };

  const handleListDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleListDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleListDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) {
      handleListDragEnd();
      return;
    }

    const reorderedVisible = [...visibleTables];
    const [moved] = reorderedVisible.splice(draggedIdx, 1);
    reorderedVisible.splice(index, 0, moved);

    // Update local state immediately for snappy feel
    const otherTables = tables.filter(
      (t) => !visibleTables.find((vt) => vt.id === t.id)
    );
    const finalOrder = [...reorderedVisible, ...otherTables];
    setTables(finalOrder);

    handleListDragEnd();

    // Persist
    const res = await saveTableSortOrderAction({
      orderedIds: finalOrder.map((t) => t.id),
    });

    if (res?.data?.success) {
      toast.success("Orden actualizado");
    } else {
      toast.error("Error al guardar orden");
      router.refresh();
    }
  };

  // ── Template Drag & Drop (Create by dragging) ──────────────────────────────

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

    // Zoomed/Pan coordinates
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
          type: fixtureType,
          label: null,
          gridCol,
          gridRow,
          colSpan: entry.defaultColSpan,
          rowSpan: entry.defaultRowSpan,
          rotation: 0,
        });
        if (result?.data?.success) {
          const created = result.data.fixture as FloorFixture;
          setFixtures((p) => [...p, created]);
          addFixturePositions([
            {
              id: created.id,
              gridCol,
              gridRow,
              colSpan: created.colSpan,
              rowSpan: created.rowSpan,
              rotation: 0,
            },
          ]);
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
      // Default dimensions based on shape
      const colSpan = shape === "rectangular" ? 3 : 2;
      const rowSpan = 2;

      setEditingTable({
        label: `Mesa ${tables.length + 1}`,
        section: activeSection === "all" ? "Principal" : activeSection,
        capacity: 4,
        shape,
        gridCol,
        gridRow,
        colSpan,
        rowSpan,
        rotation: 0,
        isActive: true,
      });
      setIsModalOpen(true);
    }
  };

  // ── Layout actions ─────────────────────────────────────────────────────────

  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
      // 1. Save grid size if it changed
      if (
        gridCols !== (initialSettings?.tablesGridCols ?? 20) ||
        gridRows !== (initialSettings?.tablesGridRows ?? 14)
      ) {
        await updateGridSizeAction({ cols: gridCols, rows: gridRows });
      }

      // 2. Save table positions + rotations
      if (isDirty) {
        const updates = Object.values(positions).map((p) => ({
          ...p,
          rotation: rotations[p.id] ?? 0,
        }));
        const result = await saveTableLayoutAction({ updates });
        if (result?.data?.success) {
          resetDirty();
        } else {
          toast.error(result?.serverError ?? "Error al guardar mesas");
        }
      }

      // 3. Save fixture positions
      if (fixtureIsDirty) {
        const fixtureUpdates = Object.values(fixturePositions).map((p) => ({
          id: p.id,
          gridCol: p.gridCol,
          gridRow: p.gridRow,
          colSpan: p.colSpan,
          rowSpan: p.rowSpan,
          rotation: (p.rotation ?? 0) as 0 | 90 | 180 | 270,
        }));
        const fixtureResult = await saveFixtureLayoutAction({ updates: fixtureUpdates });
        if (fixtureResult?.data?.success) {
          resetFixtureDirty();
        } else {
          toast.error(fixtureResult?.serverError ?? "Error al guardar espacios");
        }
      }

      toast.success("Diseño guardado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSavingLayout(false);
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const openCreate = () => {
    // Recolectar TODAS las celdas ocupadas por mesas existentes
    const occupiedCells = new Set<string>();
    Object.values(positions).forEach((p) => {
      for (let r = 0; r < p.rowSpan; r++) {
        for (let c = 0; c < p.colSpan; c++) {
          occupiedCells.add(`${p.gridCol + c},${p.gridRow + r}`);
        }
      }
    });

    let col = 1, row = 1;
    // Buscar un espacio de 2x2 libre (recorremos toda la malla)
    outer: for (row = 1; row <= gridRows - 1; row++) {
      for (col = 1; col <= gridCols - 1; col++) {
        let isFree = true;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            if (occupiedCells.has(`${col + c},${row + r}`)) {
              isFree = false;
              break;
            }
          }
          if (!isFree) break;
        }
        if (isFree) break outer;
      }
    }
    setEditingTable({
      label: `Mesa ${tables.length + 1}`,
      section: "Principal",
      capacity: 4,
      shape: "cuadrada",
      rotation: 0,
      gridCol: col,
      gridRow: row,
      colSpan: 2,
      rowSpan: 2,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Quick-rotate a table on the canvas
  // Squares cycle every 45°, rectangular/circular every 90°
  const rotateTable = useCallback((id: string) => {
    const shape = tables.find((t) => t.id === id)?.shape ?? "cuadrada";
    const step = shape === "cuadrada" ? 45 : 90;
    setRotations((prev) => {
      const cur = prev[id] ?? 0;
      const next = ((cur + step) % 360) as TableRotation;
      return { ...prev, [id]: next };
    });
    // Mark layout as dirty so "Guardar Layout" becomes active
    updatePosition(id, {}); // no-op that still triggers isDirty
  }, [tables, updatePosition]);

  const openEdit = (table: RestaurantTable) => {
    setEditingTable({ ...table, rotation: ((table.rotation ?? 0) as TableRotation) });
    setIsModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    // Client-side duplicate guard
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
      // Si el diseño está sucio (mesas movidas), guardamos el layout primero
      // para asegurar que la nueva mesa no choque con posiciones desactualizadas en DB
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
        } else {
          toast.error(result?.data?.error ?? result?.serverError ?? "Error al actualizar");
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
        } else {
          toast.error(result?.data?.error ?? result?.serverError ?? "Error al crear");
        }
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleDeleteFixture = async (id: string) => {
    try {
      const result = await deleteFixtureAction({ id });
      if (result?.data?.success) {
        setFixtures((prev) => prev.filter((f) => f.id !== id));
        removeFixturePosition(id);
        setSelectedFixtureId(null);
        toast.success("Elemento eliminado");
      } else {
        toast.error("Error al eliminar elemento");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteTableAction({ id });
      if (result?.data?.success) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        if (selectedId === id) setSelectedId(null);
        toast.success("Mesa eliminada");
      } else {
        toast.error(result?.serverError ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRegenToken = async (id: string) => {
    try {
      const result = await regenerateTokenAction({ id });
      if (result?.data?.success) {
        setTables((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, qrToken: result.data?.qrToken ?? t.qrToken }
              : t
          )
        );
        toast.success("Nuevo QR generado — imprímelo y reemplaza el físico");
        if (qrPreviewId === id) setQrPreviewId(null); // invalidate preview
      } else {
        toast.error(result?.serverError ?? "Error al regenerar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setConfirmRegen(null);
    }
  };

  const handleToggle = async (table: RestaurantTable) => {
    const optimistic = { ...table, isActive: !table.isActive };
    setTables((prev) => prev.map((t) => (t.id === table.id ? optimistic : t)));
    try {
      await updateTableAction({ id: table.id, isActive: !table.isActive });
    } catch {
      setTables((prev) => prev.map((t) => (t.id === table.id ? table : t)));
      toast.error("Error al cambiar estado");
    }
  };

  // ── Heritage palette vars ─────────────────────────────────────────────────

  const cream = "#fff8f3";
  const ink = "#251a07";
  const red = "#bb0005";
  const redContainer = "#e2231a";
  const surfaceLow = "#fff2e2";
  const outlineVariant = "rgba(231,189,183,0.4)";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: cream,
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', system-ui, sans-serif)",
        color: ink,
      }}
    >
      {/* ── Top bar ── */}
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
              {activeTables.length} mesas activas · {activeTables.reduce((s, t) => s + t.capacity, 0)} cubiertos
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="hidden md:flex items-center rounded-xl border p-1 ml-4" style={{ borderColor: outlineVariant, background: surfaceLow }}>
            <button
              onClick={() => { setEditMode("tables"); setSelectedFixtureId(null); }}
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
              onClick={() => { setEditMode("space"); setSelectedId(null); }}
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
              onClick={() => handleZoomChange(Math.max(0.4, +(zoom - 0.1).toFixed(1)))}
              title="Alejar (−)"
            >
              <ZoomOut size={14} style={{ color: ink }} />
            </button>
            <span className="w-10 text-center text-xs font-bold tabular-nums" style={{ color: ink }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white"
              onClick={() => handleZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)))}
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
              background: isDirty
                ? `linear-gradient(15deg, ${red}, ${redContainer})`
                : surfaceLow,
              color: isDirty ? "#fff" : "#9a7a5a",
              boxShadow: isDirty ? `0 4px 24px rgba(187,0,5,0.25)` : "none",
              cursor: isDirty ? "pointer" : "default",
            }}
            onClick={handleSaveLayout}
            disabled={!(isDirty || fixtureIsDirty) || isSavingLayout}
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

      {/* ── Mobile tab bar ── */}
      <div
        className="flex shrink-0 lg:hidden"
        style={{ borderBottom: `1px solid ${outlineVariant}` }}
      >
        {(["plan", "list"] as const).map((tab) => (
          <button
            key={tab}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
            style={{
              color: activePanel === tab ? red : "#9a7a5a",
              borderBottom: activePanel === tab ? `2px solid ${red}` : "2px solid transparent",
              background: cream,
            }}
            onClick={() => setActivePanel(tab)}
          >
            {tab === "plan" ? <Map size={16} /> : <LayoutGrid size={16} />}
            {tab === "plan" ? "Plano" : "Mesas"}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Floor plan ── */}
        <div
          className={cn(
            "flex flex-col overflow-hidden flex-1",
            activePanel !== "plan" && "hidden lg:flex"
          )}
        >
          {/* Section filter bar */}
          <div
            className="flex shrink-0 items-center gap-2 overflow-x-auto px-6 py-3 scrollbar-none"
            style={{ borderBottom: `1px solid ${outlineVariant}` }}
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

          {/* Canvas */}
          <div
            className="flex-1 overflow-auto"
            style={{ background: "#f5ede4" }}
          >
            <div className="flex min-h-full min-w-full items-start justify-center p-10">
              <div
                ref={floorRef}
                className="relative origin-top"
                onPointerMove={onFloorPointerMove}
                onPointerUp={onFloorPointerUp}
                onPointerLeave={onFloorPointerUp}
                onDragOver={onFloorDragOver}
                onDrop={onFloorDrop}
                style={{
                  width: gridCols * CELL_SIZE * zoom,
                  height: gridRows * CELL_SIZE * zoom,
                  background: "#fffaf6",
                  borderRadius: 16,
                  boxShadow:
                    "0 8px 64px rgba(37,26,7,0.12), 0 2px 8px rgba(37,26,7,0.06)",
                  // Dot grid scaled with zoom
                  backgroundImage:
                    "radial-gradient(circle, #d4bfa8 1px, transparent 1px)",
                  backgroundSize: `${CELL_SIZE * zoom}px ${CELL_SIZE * zoom}px`,
                  position: "relative",
                }}
              >
                {/* ── Fixtures Rendering ── */}
                {fixtures.map((fixture) => {
                  const pos = fixturePositions[fixture.id] ?? fixture;
                  const isSelected = selectedFixtureId === fixture.id && editMode === "space";
                  const isDraggingThis = draggingId === fixture.id;
                  const entry = CATALOG_BY_TYPE[fixture.type];
                  if (!entry) return null;

                  return (
                    <div
                      key={fixture.id}
                      onPointerDown={(e) => editMode === "space" && startFixtureDrag(e, fixture.id)}
                      onClick={() => editMode === "space" && setSelectedFixtureId((prev) => (prev === fixture.id ? null : fixture.id))}
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
                        {/* Icon and/or Label */}
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
                              onChange={async (e) => {
                                const val = e.target.value || null;
                                setFixtures(p => p.map(f => f.id === fixture.id ? { ...f, label: val } : f));
                                await updateFixtureAction({ id: fixture.id, label: val });
                              }}
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
                      
                      {/* Configuration Controls — Only when selected in Space Mode */}
                      {isSelected && (
                        <>
                          {/* Close/Deselect */}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setSelectedFixtureId(null); }}
                            className="absolute flex items-center justify-center rounded-full bg-slate-800 text-white shadow-lg"
                            style={{ top: -12, left: -12, width: 24, height: 24, zIndex: 12, border: "2px solid #fff" }}
                          >
                            <X size={14} />
                          </button>

                          {/* Delete button */}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleDeleteFixture(fixture.id); }}
                            className="absolute flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
                            style={{ top: -12, right: -12, width: 24, height: 24, zIndex: 12, border: "2px solid #fff" }}
                          >
                            <Trash2 size={12} strokeWidth={2.5} />
                          </button>

                          {/* Bottom Controls Bar */}
                          <div 
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 flex items-center gap-2 p-2 rounded-2xl bg-white shadow-2xl border pointer-events-auto"
                            style={{ borderColor: outlineVariant, zIndex: 20 }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {/* Rotate Button */}
                            <button
                              onClick={() => updateFixturePosition(fixture.id, { rotation: ((pos.rotation + 90) % 360) as 0|90|180|270 })}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs"
                              style={{ color: red }}
                            >
                              <RefreshCw size={14} />
                              <span>Rotar</span>
                            </button>
                          </div>

                          {/* Resize Handle (Bottom-Right) */}
                          <div
                            onPointerDown={(e) => startFixtureResize(e, fixture.id)}
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

                {/* ── Tables Rendering ── */}
                {visibleTables.map((table) => {
                  const pos = positions[table.id] ?? table;
                  const pal = paletteFor(table.section);
                  const isSelected = selectedId === table.id && editMode === "tables";
                  const isDraggingThis = draggingId === table.id;
                  const rotation = rotations[table.id] ?? 0;

                  return (
                    <div
                      key={table.id}
                      onPointerDown={(e) => editMode === "tables" && startDrag(e, table.id)}
                      onClick={() => editMode === "tables" && setSelectedId((prev) => (prev === table.id ? null : table.id))}
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
                      {/* Inner visual — rotated independently, drag hitbox stays grid-aligned */}
                      <div
                        className="flex flex-col items-center justify-center w-full h-full overflow-hidden"
                        style={{
                          background: table.isActive ? pal.bg : "#f0ede8",
                          border: `2px solid ${isSelected ? red : table.isActive ? pal.border : "#d4cfc8"}`,
                          borderRadius:
                            table.shape === "circular" ? "50%" :
                            table.shape === "cuadrada" ? 4 : 8,
                          opacity: editMode === "tables" ? (table.isActive ? 1 : 0.5) : 0.4,
                          boxShadow: isSelected
                            ? `0 0 0 3px ${red}30, 0 8px 24px ${red}20`
                            : `0 2px 8px rgba(37,26,7,0.08)`,
                          transform: `rotate(${rotation}deg)`,
                          transition: isDraggingThis
                            ? "none"
                            : "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.15s",
                        }}>
                        {/* Counter-rotate content so text is always upright.
                            We constrain the width to the visible "inner diamond"
                            so text never gets clipped at the table edges. */}
                        <div
                          className="flex flex-col items-center justify-center overflow-hidden"
                          style={{
                            transform: `rotate(${-rotation}deg)`,
                            // For 45° the visible diagonal is side × cos(45°) ≈ 70%
                            // For 0/90/180/270 the full width is fine
                            maxWidth: (rotation % 90 !== 0)
                              ? `${Math.cos((Math.PI / 180) * 45) * 100}%`
                              : "90%",
                            maxHeight: (rotation % 90 !== 0)
                              ? `${Math.cos((Math.PI / 180) * 45) * 100}%`
                              : "90%",
                          }}
                        >
                          <span
                            className="font-black leading-tight text-center w-full break-words"
                            style={{
                              fontSize: Math.max(8, Math.min(pos.colSpan * 4.5, 14)),
                              color: table.isActive ? pal.text : "#9a9590",
                              fontFamily: "var(--font-epilogue, serif)",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {table.label}
                          </span>
                          <div
                            className="flex items-center gap-0.5 mt-0.5"
                            style={{
                              opacity: 0.6,
                              fontSize: Math.max(7, pos.colSpan * 3.5),
                              color: table.isActive ? pal.text : "#9a9590",
                            }}
                          >
                            <Users size={Math.max(7, pos.colSpan * 3.5)} />
                            <span>{table.capacity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rotate button — appears when selected */}
                      {isSelected && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); rotateTable(table.id); }}
                          className="absolute flex items-center justify-center rounded-full"
                          style={{
                            top: -14, right: -14,
                            width: 26, height: 26,
                            background: `linear-gradient(135deg, ${red}, #e2231a)`,
                            color: "#fff",
                            boxShadow: `0 2px 8px ${red}60`,
                            border: "2px solid #fff",
                            zIndex: 20,
                            cursor: "pointer",
                          }}
                          title="Rotar 90°"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Zoom hint */}
          <div
            className="shrink-0 flex items-center justify-center gap-4 py-2 text-xs"
            style={{ color: "#b5997a", borderTop: `1px solid ${outlineVariant}` }}
          >
            <span>Arrastra mesas desde el panel derecho hacia el plano para crear · +/- para zoom</span>
          </div>
        </div>

        {/* ── Side panel: list & detail ── */}
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
                    onClick={() => setQrPreviewId(selectedTable.id)}
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
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{ background: surfaceLow, color: ink, border: `1px solid ${outlineVariant}` }}
                      onClick={() => window.open(`/api/admin/tables/${selectedTable.id}/qr`, "_blank")}
                    >
                      <Download size={12} />
                      QR
                    </button>
                    <button
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{ color: "#c26000", background: "#fff7ed", border: "1px solid #fbbf7a" }}
                      onClick={() => setConfirmRegen(selectedTable.id)}
                    >
                      <RefreshCw size={12} />
                      Nuevo
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                    style={{ background: "#fff", border: `1px solid ${outlineVariant}`, color: ink }}
                    onClick={() => openEdit(selectedTable)}
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                    style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}
                    onClick={() => setConfirmDelete(selectedTable.id)}
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
                        onDragStart={(e) => handleListDragStart(e, i)}
                        onDragOver={(e) => handleListDragOver(e, i)}
                        onDragEnd={handleListDragEnd}
                        onDrop={(e) => handleListDrop(e, i)}
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
                          setSelectedId((prev) => (prev === table.id ? null : table.id))
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
                        <Switch
                          checked={table.isActive}
                          onCheckedChange={() => handleToggle(table)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-green-600 shrink-0"
                        />

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
      </div>

      {/* ── QR full preview modal ── */}
      <Dialog open={!!qrPreviewId} onOpenChange={() => setQrPreviewId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-epilogue, serif)" }}>
              {tables.find((t) => t.id === qrPreviewId)?.label}
            </DialogTitle>
            <DialogDescription>
              Escanea o descarga el código QR de esta mesa.
            </DialogDescription>
          </DialogHeader>
          {qrPreviewId && (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/tables/${qrPreviewId}/qr`}
                alt="QR Mesa"
                className="w-56 h-56 rounded-2xl border"
                style={{ borderColor: outlineVariant }}
              />
              <div className="flex gap-2 w-full">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold"
                  style={{ background: surfaceLow, color: ink, border: `1px solid ${outlineVariant}` }}
                  onClick={() => {
                    window.open(`/api/admin/tables/${qrPreviewId}/qr`, "_blank");
                  }}
                >
                  <Download size={15} /> Descargar PNG
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold"
                  style={{
                    background: `linear-gradient(15deg, ${red}, ${redContainer})`,
                    color: "#fff",
                  }}
                  onClick={() => setQrPreviewId(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "var(--font-epilogue, serif)", fontSize: "1.25rem" }}
            >
              {editingTable?.id ? "Editar Mesa" : "Nueva Mesa"}
            </DialogTitle>
            <DialogDescription>
              Configura la identidad y dimensiones en el plano.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTable} className="space-y-6 pt-2">
            {/* Label + Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                  Nombre
                </Label>
                {/* Inline duplicate check */}
                {(() => {
                  const labelVal = editingTable?.label?.trim() ?? "";
                  const isDup = labelVal.length > 0 && tables.some(
                    (t) =>
                      t.id !== editingTable?.id &&
                      t.label.trim().toLowerCase() === labelVal.toLowerCase()
                  );
                  return (
                    <>
                      <Input
                        id="label"
                        value={editingTable?.label ?? ""}
                        onChange={(e) =>
                          setEditingTable((p) => ({ ...p!, label: e.target.value }))
                        }
                        required
                        className="rounded-xl bg-white"
                        style={isDup ? { borderColor: red } : {}}
                      />
                      {isDup && (
                        <p className="text-xs font-medium" style={{ color: red }}>
                          Ya existe una mesa con ese nombre
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                  Sección
                </Label>
                <Select
                  value={editingTable?.section ?? "Principal"}
                  onValueChange={(v) =>
                    setEditingTable((p) => ({ ...p!, section: v }))
                  }
                >
                  <SelectTrigger className="rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capacity + Shape */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                  Capacidad
                </Label>
                <Input
                  type="number"
                  value={editingTable?.capacity ?? 4}
                  onChange={(e) =>
                    setEditingTable((p) => ({
                      ...p!,
                      capacity: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  min={1}
                  max={30}
                  className="rounded-xl bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                  Forma
                </Label>
                <Select
                  value={editingTable?.shape ?? "cuadrada"}
                  onValueChange={(v) => {
                    const shape = v as TableShape;
                    setEditingTable((p) => {
                      if (!p) return null;
                      const updates: any = { shape };
                      if (shape === "rectangular") {
                        updates.colSpan = 3;
                        updates.rowSpan = 2;
                      } else {
                        updates.colSpan = 2;
                        updates.rowSpan = 2;
                      }
                      return { ...p, ...updates };
                    });
                  }}
                >
                  <SelectTrigger className="rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="cuadrada">Cuadrada</SelectItem>
                    <SelectItem value="rectangular">Rectangular</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rotation picker — squares: 8 steps of 45°, others: 4 steps of 90° */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                Rotación inicial
              </Label>
              {(() => {
                const isSquare = (editingTable?.shape ?? "cuadrada") === "cuadrada";
                const degrees = isSquare
                  ? ([0, 45, 90, 135, 180, 225, 270, 315] as const)
                  : ([0, 90, 180, 270] as const);
                const cols = isSquare ? 4 : 4;
                const lastDeg = degrees[degrees.length - 1];
                return (
                  <div
                    className="grid overflow-hidden rounded-xl border"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      borderColor: outlineVariant,
                    }}
                  >
                    {degrees.map((deg, i) => {
                      const active = (editingTable?.rotation ?? 0) === deg;
                      const isLastInRow = (i + 1) % cols === 0;
                      const isLastRow = i >= degrees.length - cols;
                      return (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setEditingTable((p) => ({ ...p!, rotation: deg as TableRotation }))}
                          className="py-2 text-sm font-semibold transition-all"
                          style={{
                            background: active ? `linear-gradient(135deg, ${red}, #e2231a)` : "#fff",
                            color: active ? "#fff" : ink,
                            borderRight: !isLastInRow ? `1px solid ${outlineVariant}` : "none",
                            borderBottom: !isLastRow ? `1px solid ${outlineVariant}` : "none",
                          }}
                        >
                          {deg}°
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Grid dimensions */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: surfaceLow }}
            >
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9a7a5a" }}>
                Dimensiones en plano (celdas)
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {(
                  [
                    ["Columna", "gridCol", 1, gridCols],
                    ["Fila", "gridRow", 1, gridRows],
                    ["Ancho", "colSpan", 1, 8],
                    ["Alto", "rowSpan", 1, 8],
                  ] as const
                ).map(([label, key, min, max]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide" style={{ color: "#b5997a" }}>
                      {label}
                    </Label>
                    <Input
                      type="number"
                      value={(editingTable as Record<string, unknown>)?.[key] as number ?? 1}
                      onChange={(e) =>
                        setEditingTable((p) => ({
                          ...p!,
                          [key]: Math.max(min, Math.min(max, parseInt(e.target.value) || min)),
                        }))
                      }
                      min={min}
                      max={max}
                      className="rounded-xl text-center bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={editingTable?.isActive ?? true}
                onCheckedChange={(v) =>
                  setEditingTable((p) => ({ ...p!, isActive: v }))
                }
                className="data-[state=checked]:bg-green-600"
              />
              <Label className="font-medium" style={{ color: ink }}>
                Mesa activa
              </Label>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all"
                style={{ background: surfaceLow, color: ink }}
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-full px-6 py-2.5 text-sm font-bold transition-all"
                style={{
                  background: `linear-gradient(15deg, ${red}, ${redContainer})`,
                  color: "#fff",
                  boxShadow: `0 4px 16px rgba(187,0,5,0.25)`,
                }}
              >
                {editingTable?.id ? "Guardar" : "Crear Mesa"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: "#be123c" }} />
              Eliminar mesa
            </DialogTitle>
            <DialogDescription>
              Esta acción es permanente. Se eliminará{" "}
              <strong>{tables.find((t) => t.id === confirmDelete)?.label}</strong> y
              su QR dejará de funcionar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{ background: surfaceLow, color: ink }}
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </button>
            <button
              className="rounded-full px-5 py-2 text-sm font-bold"
              style={{ background: "#be123c", color: "#fff" }}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm regen token ── */}
      <Dialog open={!!confirmRegen} onOpenChange={() => setConfirmRegen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw size={18} style={{ color: "#c26000" }} />
              Regenerar código QR
            </DialogTitle>
            <DialogDescription>
              El QR actual de{" "}
              <strong>{tables.find((t) => t.id === confirmRegen)?.label}</strong>{" "}
              dejará de funcionar. Deberás imprimir y reemplazar el físico en la mesa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{ background: surfaceLow, color: ink }}
              onClick={() => setConfirmRegen(null)}
            >
              Cancelar
            </button>
            <button
              className="rounded-full px-5 py-2 text-sm font-bold"
              style={{ background: "#c26000", color: "#fff" }}
              onClick={() => confirmRegen && handleRegenToken(confirmRegen)}
            >
              Regenerar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}