import { create } from 'zustand';
import type { CropId } from '../farming/CropDefs';
import type { ForageId } from '../foraging/forageDefs';

export type ItemId = CropId | 'seed_wheat' | 'seed_tomato' | 'seed_corn' | ForageId;

export interface SlotItem {
  id: ItemId;
  qty: number;
}

export const INVENTORY_SIZE = 12;
const STACK_MAX = 99;

export interface InventoryState {
  slots: (SlotItem | null)[];
  gold: number;
}

export interface InventoryActions {
  /** Stacks into existing slots of same id; spills into first empty. Returns true if all fit. */
  add: (id: ItemId, qty: number) => boolean;
  /** Removes qty across stacks. Returns true if removal succeeded fully. */
  remove: (id: ItemId, qty: number) => boolean;
  count: (id: ItemId) => number;
  swap: (a: number, b: number) => void;
  reset: () => void;
  addGold: (amount: number) => void;
  /** Returns false if player has insufficient gold. */
  removeGold: (amount: number) => boolean;
}

function makeInitial(): InventoryState {
  const slots: (SlotItem | null)[] = new Array<SlotItem | null>(INVENTORY_SIZE).fill(null);
  slots[0] = { id: 'seed_wheat', qty: 6 };
  slots[1] = { id: 'seed_tomato', qty: 4 };
  return { slots, gold: 500 };
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  ...makeInitial(),
  add: (id, qty) => {
    if (qty <= 0) return true;
    const slots = [...get().slots];
    let remaining = qty;
    // 1) fill existing stacks first
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const s = slots[i];
      if (s && s.id === id && s.qty < STACK_MAX) {
        const room = STACK_MAX - s.qty;
        const drop = Math.min(remaining, room);
        slots[i] = { ...s, qty: s.qty + drop };
        remaining -= drop;
      }
    }
    // 2) place in first empty
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      if (slots[i] === null) {
        const drop = Math.min(remaining, STACK_MAX);
        slots[i] = { id, qty: drop };
        remaining -= drop;
      }
    }
    set({ slots });
    return remaining === 0;
  },
  remove: (id, qty) => {
    if (qty <= 0) return true;
    const have = get().count(id);
    if (have < qty) return false;
    const slots = [...get().slots];
    let remaining = qty;
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const s = slots[i];
      if (s && s.id === id) {
        const take = Math.min(s.qty, remaining);
        const left = s.qty - take;
        slots[i] = left === 0 ? null : { ...s, qty: left };
        remaining -= take;
      }
    }
    set({ slots });
    return true;
  },
  count: (id) => get().slots.reduce((acc, s) => (s && s.id === id ? acc + s.qty : acc), 0),
  swap: (a, b) => {
    if (a === b) return;
    const slots = [...get().slots];
    if (a < 0 || b < 0 || a >= slots.length || b >= slots.length) return;
    const sa = slots[a] ?? null;
    const sb = slots[b] ?? null;
    if (sa && sb && sa.id === sb.id && sa.qty < STACK_MAX) {
      const room = STACK_MAX - sa.qty;
      const drop = Math.min(sb.qty, room);
      slots[a] = { ...sa, qty: sa.qty + drop };
      const remB = sb.qty - drop;
      slots[b] = remB === 0 ? null : { ...sb, qty: remB };
    } else {
      slots[a] = sb;
      slots[b] = sa;
    }
    set({ slots });
  },
  reset: () => set(makeInitial()),
  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),
  removeGold: (amount) => {
    if (get().gold < amount) return false;
    set((s) => ({ gold: s.gold - amount }));
    return true;
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __inv: typeof useInventoryStore }).__inv = useInventoryStore;
}
