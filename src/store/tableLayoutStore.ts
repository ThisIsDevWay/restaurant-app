import { create } from "zustand";

interface TablePosition {
  id: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
}

interface TableLayoutState {
  positions: Record<string, TablePosition>;
  isDirty: boolean;
  gridCols: number;
  gridRows: number;
  setPositions: (tables: TablePosition[]) => void;
  addPositions: (tables: TablePosition[]) => void;
  updatePosition: (id: string, pos: Partial<TablePosition>) => void;
  resetDirty: () => void;
  setGridSize: (cols: number, rows: number) => void;
}

function resolveCollisions(
  newTables: TablePosition[],
  gridCols: number,
  gridRows: number,
  existingPositions: Record<string, TablePosition> = {}
): { resolved: TablePosition[]; changed: boolean } {
  // Copiamos las posiciones existentes para rastrear la ocupación total
  const occupied = new Set<string>();
  let changed = false;

  // Marcar celdas ocupadas por mesas que NO estamos resolviendo ahora
  Object.values(existingPositions).forEach((p) => {
    for (let r = 0; r < p.rowSpan; r++) {
      for (let c = 0; c < p.colSpan; c++) {
        occupied.add(`${p.gridCol + c},${p.gridRow + r}`);
      }
    }
  });

  const resolved = newTables.map((t) => {
    let col = t.gridCol;
    let row = t.gridRow;

    const fits = (c: number, r: number) => {
      // Fuera de límites
      if (c < 1 || r < 1 || c + t.colSpan - 1 > gridCols || r + t.rowSpan - 1 > gridRows) return false;

      // Solapamiento
      for (let tr = 0; tr < t.rowSpan; tr++) {
        for (let tc = 0; tc < t.colSpan; tc++) {
          if (occupied.has(`${c + tc},${r + tr}`)) return false;
        }
      }
      return true;
    };

    // Si no cabe donde dice, buscamos el primer hueco disponible
    if (!fits(col, row)) {
      changed = true;
      let found = false;
      outer: for (let r = 1; r <= gridRows - t.rowSpan + 1; r++) {
        for (let c = 1; c <= gridCols - t.colSpan + 1; c++) {
          if (fits(c, r)) {
            col = c;
            row = r;
            found = true;
            break outer;
          }
        }
      }
      
      // Si después de recorrer todo no hay espacio (malla llena), 
      // mantenemos su posición original aunque solape (como último recurso)
      if (!found) {
        col = t.gridCol;
        row = t.gridRow;
      }
    }

    // Registrar la posición (sea la original o la nueva) como ocupada para el siguiente item
    for (let r = 0; r < t.rowSpan; r++) {
      for (let c = 0; c < t.colSpan; c++) {
        occupied.add(`${col + c},${row + r}`);
      }
    }

    return { ...t, gridCol: col, gridRow: row };
  });

  return { resolved, changed };
}

export const useTableLayoutStore = create<TableLayoutState>((set, get) => ({
  positions: {},
  isDirty: false,
  gridCols: 20,
  gridRows: 14,
  setPositions: (tables) => {
    const { gridCols, gridRows } = get();
    const { resolved, changed } = resolveCollisions(tables, gridCols, gridRows);
    const positions: Record<string, TablePosition> = {};
    resolved.forEach((t) => {
      positions[t.id] = t;
    });
    set({ positions, isDirty: changed });
  },
  addPositions: (tables) => {
    const { gridCols, gridRows, positions: currentPositions, isDirty } = get();
    const { resolved, changed } = resolveCollisions(tables, gridCols, gridRows, currentPositions);
    const newPositions = { ...currentPositions };
    resolved.forEach((t) => {
      newPositions[t.id] = t;
    });
    set({ 
      positions: newPositions,
      isDirty: isDirty || changed 
    });
  },
  updatePosition: (id, pos) => {
    set((state) => ({
      positions: {
        ...state.positions,
        [id]: { ...state.positions[id], ...pos },
      },
      isDirty: true,
    }));
  },
  resetDirty: () => set({ isDirty: false }),
  setGridSize: (cols, rows) => {
    set({ gridCols: cols, gridRows: rows, isDirty: true });
  },
}));
