import { create } from 'zustand';

export interface CraftingState {
  open: boolean;
}

export interface CraftingActions {
  openCrafting: () => void;
  closeCrafting: () => void;
  toggleCrafting: () => void;
}

export const useCraftingStore = create<CraftingState & CraftingActions>((set) => ({
  open: false,
  openCrafting: () => set({ open: true }),
  closeCrafting: () => set({ open: false }),
  toggleCrafting: () => set((s) => ({ open: !s.open })),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __crafting: typeof useCraftingStore }).__crafting = useCraftingStore;
}
