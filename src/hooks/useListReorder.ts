import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveTableSortOrderAction } from "@/actions/restaurant-tables";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";

interface UseListReorderParams {
  visibleTables: RestaurantTable[];
  tables: RestaurantTable[];
  setTables: (tables: RestaurantTable[]) => void;
}

/**
 * Hook to manage HTML5 Drag and Drop for reordering the table list.
 */
export function useListReorder({
  visibleTables,
  tables,
  setTables,
}: UseListReorderParams) {
  const router = useRouter();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleListDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
  }, []);

  const handleListDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  }, []);

  const handleListDragEnd = useCallback(() => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleListDrop = useCallback(async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) {
      handleListDragEnd();
      return;
    }

    const reorderedVisible = [...visibleTables];
    const [moved] = reorderedVisible.splice(draggedIdx, 1);
    reorderedVisible.splice(index, 0, moved);

    const otherTables = tables.filter(
      (t) => !visibleTables.find((vt) => vt.id === t.id)
    );
    const finalOrder = [...reorderedVisible, ...otherTables];
    setTables(finalOrder);

    handleListDragEnd();

    try {
      const res = await saveTableSortOrderAction({
        orderedIds: finalOrder.map((t) => t.id),
      });

      if (res?.data?.success) {
        toast.success("Orden actualizado");
      } else {
        toast.error("Error al guardar orden");
        router.refresh();
      }
    } catch {
      toast.error("Error de conexión");
    }
  }, [draggedIdx, visibleTables, tables, setTables, handleListDragEnd, router]);

  return {
    draggedIdx,
    dragOverIdx,
    handleListDragStart,
    handleListDragOver,
    handleListDragEnd,
    handleListDrop,
  };
}
