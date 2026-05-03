import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  deleteTableAction, 
  regenerateTokenAction 
} from "@/actions/restaurant-tables";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { TableRotation, EditingTable } from "@/lib/salon-types";
import type { TablePosition } from "@/store/tableLayoutStore";

interface UseTableCRUDParams {
  tables: RestaurantTable[];
  setTables: (updateFn: (prev: RestaurantTable[]) => RestaurantTable[]) => void;
  positions: Record<string, TablePosition>;
  updatePosition: (id: string, pos: Partial<TablePosition>) => void;
  gridCols: number;
  gridRows: number;
  activeSection: string;
}

/**
 * Hook to manage Table-related CRUD operations and modal states.
 */
export function useTableCRUD({
  tables,
  setTables,
  positions,
  updatePosition,
  gridCols,
  gridRows,
  activeSection,
}: UseTableCRUDParams) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EditingTable | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [qrPreviewId, setQrPreviewId] = useState<string | null>(null);
  const [rotations, setRotations] = useState<Record<string, TableRotation>>({});

  const openCreate = useCallback(() => {
    const occupiedCells = new Set<string>();
    Object.values(positions).forEach((p) => {
      for (let r = 0; r < p.rowSpan; r++) {
        for (let c = 0; c < p.colSpan; c++) {
          occupiedCells.add(`${p.gridCol + c},${p.gridRow + r}`);
        }
      }
    });

    let col = 1, row = 1;
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
      section: activeSection === "all" ? "Principal" : activeSection,
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
  }, [positions, gridCols, gridRows, tables.length, activeSection]);

  const rotateTable = useCallback((id: string) => {
    const shape = tables.find((t) => t.id === id)?.shape ?? "cuadrada";
    const step = shape === "cuadrada" ? 45 : 90;
    setRotations((prev) => {
      const cur = prev[id] ?? 0;
      const next = ((cur + step) % 360) as TableRotation;
      return { ...prev, [id]: next };
    });
    updatePosition(id, {}); // Trigger dirty state
  }, [tables, updatePosition]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await deleteTableAction({ id });
      if (res?.data?.success) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        setConfirmDelete(null);
        toast.success("Mesa eliminada");
      } else {
        toast.error(res?.serverError ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }, [setTables]);

  const handleRegenToken = useCallback(async (id: string) => {
    try {
      const res = await regenerateTokenAction({ id });
      if (res?.data?.success) {
        toast.success("Token regenerado");
        setConfirmRegen(null);
      } else {
        toast.error(res?.serverError ?? "Error al regenerar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }, []);

  return {
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
  };
}
