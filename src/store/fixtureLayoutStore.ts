import { create } from "zustand";

interface FixturePosition {
  id: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
  rotation: number;
}

interface FixtureLayoutState {
  positions: Record<string, FixturePosition>;
  isDirty: boolean;
  setPositions: (fixtures: FixturePosition[]) => void;
  addPositions: (fixtures: FixturePosition[]) => void;
  updatePosition: (id: string, patch: Partial<FixturePosition>) => void;
  removePosition: (id: string) => void;
  resetDirty: () => void;
}

export const useFixtureLayoutStore = create<FixtureLayoutState>((set) => ({
  positions: {},
  isDirty: false,
  setPositions: (fixtures) =>
    set({ positions: Object.fromEntries(fixtures.map((f) => [f.id, f])), isDirty: false }),
  addPositions: (fixtures) =>
    set((s) => {
      const next = { ...s.positions };
      for (const f of fixtures) {
        next[f.id] = f;
      }
      return { positions: next };
    }),
  updatePosition: (id, patch) =>
    set((s) => ({
      positions: { ...s.positions, [id]: { ...s.positions[id]!, ...patch } },
      isDirty: true,
    })),
  removePosition: (id) =>
    set((s) => {
      const next = { ...s.positions };
      delete next[id];
      return { positions: next, isDirty: true };
    }),
  resetDirty: () => set({ isDirty: false }),
}));
