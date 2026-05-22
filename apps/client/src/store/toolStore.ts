import { create } from 'zustand';

export type ToolId = 'move' | 'hoe' | 'water' | 'seed_wheat' | 'seed_tomato' | 'harvest';

export interface ToolState {
  current: ToolId;
}

export interface ToolActions {
  set: (id: ToolId) => void;
}

export const useToolStore = create<ToolState & ToolActions>((set) => ({
  current: 'move',
  set: (current) => set({ current }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __tool: typeof useToolStore }).__tool = useToolStore;
}
