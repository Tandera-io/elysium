import { create } from 'zustand';
import type { CropId } from '../farming/CropDefs';

export type ItemId = CropId | 'seed_wheat' | 'seed_tomato' | 'seed_corn';

/** Items that can be equipped as tools when clicked in the inventory. */
export type ToolItemId = 'seed_wheat' | 'seed_tomato' | 'seed_corn';

export const TOOL_ITEM_IDS: ReadonlySet<string> = new Set<ToolItemId>([
  'seed_wheat',
  'seed_tomato',
  'seed_corn',
]);

export interface SlotItem {
  id: ItemId;
  qty: number;
}

export const INVENTORY_SIZE = 12;
const STACK_MAX = 99;

export interface InventoryState {
  slots: (SlotItem | null)[];
  gold: number;
  /** Index of the currently equipped slot, or null if nothing is equipped. */
  equippedSlotIndex: number | null;
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
   * Equip the item in the given slot as the active tool.
   * Only slots containing a tool-equippable item (seeds, tools) can be equipped.
   * If the slot is already equipped, it is unequipped instead (toggle).
   * Returns the ItemId that was equipped, or null if unequipped / not equippable.
   */
  equipTool: (slotIndex: number) => ItemId | null;
  /** Clear the equipped slot, returning to the 'move' tool. */
  unequipTool: () => void;
}

function makeInitial(): InventoryState {
  const slots: (SlotItem | null)[] = new Array<SlotItem | null>(INVENTORY_SIZE).fill(null);
  slots[0] = { id: 'seed_wheat', qty: 6 };
  slots[1] = { id: 'seed_tomato', qty: 4 };
  return { slots, gold: 500, equippedSlotIndex: null };
}

// Lazy import to avoid circular dep — toolStore is a peer store.
// We import at call-time inside equipTool so bundler sees no cycle.
function setActiveTool(id: string) {
  // Dynamic require keeps the circular dependency out of the module graph.
  import('../../store/toolStore')
    .then(({ useToolStore }) => {
      const validTools = ['move', 'hoe', 'water', 'seed_wheat', 'seed_tomato', 'harvest'];
      if (validTools.includes(id)) {
        useToolStore.getState().set(id as import('../../store/toolStore').ToolId);
      }
    })
    .catch(() => {
      /* noop */
    });
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
  equipTool: (slotIndex) => {
    const { slots, equippedSlotIndex } = get();
    const slot = slots[slotIndex] ?? null;

    // Toggle off if already equipped
    if (equippedSlotIndex === slotIndex) {
      set({ equippedSlotIndex: null });
      setActiveTool('move');
      return null;
    }

    // Only equip slots that contain equippable items
    if (!slot || !TOOL_ITEM_IDS.has(slot.id)) {
      return null;
    }

    set({ equippedSlotIndex: slotIndex });
    setActiveTool(slot.id);
    return slot.id;
  },
  unequipTool: () => {
    set({ equippedSlotIndex: null });
    setActiveTool('move');
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __inv: typeof useInventoryStore }).__inv = useInventoryStore;
}
