import { create } from 'zustand';
import type { ItemId } from '../inventory/inventoryStore';

export interface GroundItem {
  id: string;
  itemId: ItemId;
  qty: number;
  tileX: number;
  tileZ: number;
}

interface GroundItemState {
  items: GroundItem[];
}

interface GroundItemActions {
  spawnItem: (itemId: ItemId, qty: number, tileX: number, tileZ: number) => string;
  removeItem: (id: string) => GroundItem | null;
  getAtTile: (tileX: number, tileZ: number) => GroundItem | null;
  reset: () => void;
}

let _nextId = 10;

function makeInitial(): GroundItemState {
  return {
    items: [
      { id: 'gi_0', itemId: 'seed_wheat', qty: 3, tileX: 5, tileZ: 5 },
      { id: 'gi_1', itemId: 'seed_tomato', qty: 2, tileX: 7, tileZ: 5 },
    ],
  };
}

export const useGroundItemStore = create<GroundItemState & GroundItemActions>((set, get) => ({
  ...makeInitial(),
  spawnItem: (itemId, qty, tileX, tileZ) => {
    const id = `gi_${_nextId++}`;
    set((s) => ({ items: [...s.items, { id, itemId, qty, tileX, tileZ }] }));
    return id;
  },
  removeItem: (id) => {
    const item = get().items.find((it) => it.id === id);
    if (!item) return null;
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
    return item;
  },
  getAtTile: (tileX, tileZ) =>
    get().items.find((it) => it.tileX === tileX && it.tileZ === tileZ) ?? null,
  reset: () => set(makeInitial()),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __groundItems: typeof useGroundItemStore }).__groundItems =
    useGroundItemStore;
}
