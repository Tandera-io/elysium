import { create } from 'zustand';
import type { CropId } from '../farming/CropDefs';

export type ItemId = CropId | 'seed_wheat' | 'seed_tomato' | 'seed_corn' | 'watering_can';

/**
 * Items that can be "used" by the player. Usable items are consumed or triggered
 * when the player invokes useItem(). The actual effect is applied by the caller
 * (e.g. farm tile watering, crop planting) — the store only tracks selection state.
 */
export const USABLE_ITEMS: ReadonlySet<ItemId> = new Set<ItemId>([
  'watering_can',
  'seed_wheat',
  'seed_tomato',
  'seed_corn',
]);

/** Returns true if the given item is a seed variant. */
export function isSeedItem(id: ItemId): id is 'seed_wheat' | 'seed_tomato' | 'seed_corn' {
  return id === 'seed_wheat' || id === 'seed_tomato' || id === 'seed_corn';
}

/** Maps a seed item id to its corresponding crop id. */
export const SEED_TO_CROP: Record<'seed_wheat' | 'seed_tomato' | 'seed_corn', CropId> = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
};

export interface SlotItem {
  id: ItemId;
  qty: number;
}

export const INVENTORY_SIZE = 12;
const STACK_MAX = 99;

export interface InventoryState {
  slots: (SlotItem | null)[];
  gold: number;
  /** Index of the currently selected slot, or null if nothing selected. */
  selectedSlot: number | null;
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
  /**
   * Selects the given slot index as the active/held item.
   * Passing the already-selected index deselects it (toggles).
   * Passing null explicitly deselects.
   */
  selectSlot: (index: number | null) => void;
  /**
   * Returns the item in the currently selected slot, or null if no slot is
   * selected or the slot is empty.
   */
  selectedItem: () => SlotItem | null;
  /**
   * Consume one unit of the selected item (for watering can: does not consume;
   * for seeds: removes 1 from stack). Returns the item that was used, or null
   * if nothing is selected / item is not usable.
   */
  useItem: () => SlotItem | null;
}

function makeInitial(): InventoryState {
  const slots: (SlotItem | null)[] = new Array<SlotItem | null>(INVENTORY_SIZE).fill(null);
  slots[0] = { id: 'seed_wheat', qty: 6 };
  slots[1] = { id: 'seed_tomato', qty: 4 };
  slots[2] = { id: 'watering_can', qty: 1 };
  return { slots, gold: 500, selectedSlot: null };
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
  selectSlot: (index) => {
    if (index === null) {
      set({ selectedSlot: null });
      return;
    }
    // Toggle deselect if already selected
    const cur = get().selectedSlot;
    set({ selectedSlot: cur === index ? null : index });
  },
  selectedItem: () => {
    const { slots, selectedSlot } = get();
    if (selectedSlot === null) return null;
    return slots[selectedSlot] ?? null;
  },
  useItem: () => {
    const { selectedSlot, slots } = get();
    if (selectedSlot === null) return null;
    const item = slots[selectedSlot];
    if (!item) return null;
    if (!USABLE_ITEMS.has(item.id)) return null;

    // Watering can is reusable — does not deplete from inventory
    if (item.id === 'watering_can') return item;

    // Seeds and other consumables: remove 1 from stack
    const newQty = item.qty - 1;
    const newSlots = [...slots];
    newSlots[selectedSlot] = newQty === 0 ? null : { ...item, qty: newQty };
    // If slot becomes empty, deselect
    set({ slots: newSlots, selectedSlot: newQty === 0 ? null : selectedSlot });
    return item;
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __inv: typeof useInventoryStore }).__inv = useInventoryStore;
}
