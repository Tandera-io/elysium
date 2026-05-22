import { create } from 'zustand';
import type { CropId } from '../farming/CropDefs';

export type ItemId = CropId | 'seed_wheat' | 'seed_tomato';

export interface InventoryState {
  items: Partial<Record<ItemId, number>>;
}

export interface InventoryActions {
  add: (id: ItemId, qty: number) => void;
  remove: (id: ItemId, qty: number) => boolean;
  count: (id: ItemId) => number;
  reset: () => void;
}

const INITIAL_BAG: InventoryState = {
  // Player starts with a few seeds so Phase 4 can run start-to-finish
  items: { seed_wheat: 6, seed_tomato: 4 },
};

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  ...INITIAL_BAG,
  add: (id, qty) =>
    set((s) => ({
      items: { ...s.items, [id]: (s.items[id] ?? 0) + qty },
    })),
  remove: (id, qty) => {
    const have = get().items[id] ?? 0;
    if (have < qty) return false;
    set((s) => ({
      items: { ...s.items, [id]: have - qty },
    }));
    return true;
  },
  count: (id) => get().items[id] ?? 0,
  reset: () => set(INITIAL_BAG),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __inv: typeof useInventoryStore }).__inv = useInventoryStore;
}
