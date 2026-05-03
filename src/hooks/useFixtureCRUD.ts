import { useState, useCallback } from "react";
import { toast } from "sonner";
import { deleteFixtureAction } from "@/actions/floor-fixtures";
import type { FloorFixture } from "@/db/schema/floor-fixtures";

interface UseFixtureCRUDParams {
  setFixtures: (updateFn: (prev: FloorFixture[]) => FloorFixture[]) => void;
  removeFixturePosition: (id: string) => void;
}

/**
 * Hook to manage Fixture-related CRUD operations (deletion and selection).
 */
export function useFixtureCRUD({
  setFixtures,
  removeFixturePosition,
}: UseFixtureCRUDParams) {
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const handleDeleteFixture = useCallback(async (id: string) => {
    try {
      const res = await deleteFixtureAction({ id });
      if (res?.data?.success) {
        setFixtures((prev) => prev.filter((f) => f.id !== id));
        removeFixturePosition(id);
        if (selectedFixtureId === id) setSelectedFixtureId(null);
        toast.success("Elemento eliminado");
      } else {
        toast.error(res?.serverError ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }, [setFixtures, removeFixturePosition, selectedFixtureId]);

  return {
    selectedFixtureId,
    setSelectedFixtureId,
    handleDeleteFixture,
  };
}
