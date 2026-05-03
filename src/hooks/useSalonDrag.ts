import { useState, useRef, useCallback, type RefObject } from "react";
import { CELL_SIZE, DRAG_THRESHOLD_PX } from "@/lib/salon-constants";
import type { DragState } from "@/lib/salon-types";
import type { TablePosition } from "@/store/tableLayoutStore";
import type { FixturePosition } from "@/store/fixtureLayoutStore";

interface UseSalonDragParams {
  positions: Record<string, TablePosition>;
  fixturePositions: Record<string, FixturePosition>;
  zoom: number;
  gridCols: number;
  gridRows: number;
  editMode: "tables" | "space";
  floorRef: RefObject<HTMLDivElement | null>;
  updatePosition: (id: string, pos: Partial<TablePosition>) => void;
  updateFixturePosition: (id: string, patch: Partial<FixturePosition>) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedFixtureId: (id: string | null) => void;
}

/**
 * Hook to manage the Pointer-based drag & drop system for tables and fixtures.
 */
export function useSalonDrag({
  positions,
  fixturePositions,
  zoom,
  gridCols,
  gridRows,
  editMode,
  floorRef,
  updatePosition,
  updateFixturePosition,
  setSelectedId,
  setSelectedFixtureId,
}: UseSalonDragParams) {
  const dragRef = useRef<DragState | null>(null);
  const fixtureDragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<{
    id: string;
    origColSpan: number;
    origRowSpan: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string) => {
      if (editMode !== "tables") return;
      const pos = positions[id];
      if (!pos) return;
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
    [positions, editMode, floorRef, setSelectedId]
  );

  const startFixtureDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string) => {
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
    [fixturePositions, editMode, floorRef, setSelectedFixtureId]
  );

  const startFixtureResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string) => {
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
    [fixturePositions, editMode, floorRef]
  );

  const onFloorPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const fixtureDrag = fixtureDragRef.current;
      const activeDrag = drag || fixtureDrag;
      const resize = resizeRef.current;
      
      if (!activeDrag && !resize) return;

      if (resize) {
        const dx = e.clientX - resize.startX;
        const dy = e.clientY - resize.startY;
        const effectiveCell = CELL_SIZE * zoom;
        const deltaCol = Math.round(dx / effectiveCell);
        const deltaRow = Math.round(dy / effectiveCell);

        const pos = fixturePositions[resize.id];
        if (!pos) return;

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

      if (activeDrag) {
        const dx = e.clientX - activeDrag.startX;
        const dy = e.clientY - activeDrag.startY;

        if (!activeDrag.didMove && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

        if (!activeDrag.didMove) {
          activeDrag.didMove = true;
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

        const pixelDx = (newCol - activeDrag.origCol) * CELL_SIZE * zoom;
        const pixelDy = (newRow - activeDrag.origRow) * CELL_SIZE * zoom;
        activeDrag.el.style.transform = `translate(${pixelDx}px, ${pixelDy}px) scale(1.06)`;

        activeDrag.currentCol = newCol;
        activeDrag.currentRow = newRow;
      }
    },
    [positions, fixturePositions, zoom, gridCols, gridRows, updateFixturePosition]
  );

  const onFloorPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
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
        activeDrag.el.style.zIndex = "";
        activeDrag.el.style.boxShadow = "";
        activeDrag.el.style.opacity = "";
        activeDrag.el.style.cursor = "";
        activeDrag.el.style.transform = "";

        if (activeDrag.didMove) {
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

  return {
    draggingId,
    resizingId,
    startDrag,
    startFixtureDrag,
    startFixtureResize,
    onFloorPointerMove,
    onFloorPointerUp,
  };
}
