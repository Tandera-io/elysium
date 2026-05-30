import { create } from 'zustand';
import type { CropId } from '../farming/CropDefs';

export type SeedId =
  | 'seed_wheat'
  | 'seed_tomato'
  | 'seed_corn'
  | 'seed_pumpkin'
  | 'seed_strawberry';

export type FoodId = 'pao_frances' | 'bolo_fuba';
export type ToolId = 'basket';

export type ItemId = CropId | SeedId | FoodId | ToolId;

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string;
  stackable: boolean;
  usable: boolean;
  /** True when using this item opens it as a container */
  isContainer?: boolean;
  containerSize?: number;
}

export const ITEM_DEFS: Partial<Record<ItemId, ItemDef>> = {
  wheat: { id: 'wheat', name: 'Trigo', icon: '🌾', stackable: true, usable: true },
  tomato: { id: 'tomato', name: 'Tomate', icon: '🍅', stackable: true, usable: true },
  pumpkin: { id: 'pumpkin', name: 'Abóbora', icon: '🎃', stackable: true, usable: true },
  corn: { id: 'corn', name: 'Milho', icon: '🌽', stackable: true, usable: true },
  strawberry: { id: 'strawberry', name: 'Morango', icon: '🍓', stackable: true, usable: true },
  seed_wheat: {
    id: 'seed_wheat',
    name: 'Sementes de trigo',
    icon: '🌱',
    stackable: true,
    usable: false,
  },
  seed_tomato: {
    id: 'seed_tomato',
    name: 'Sementes de tomate',
    icon: '🌱',
    stackable: true,
    usable: false,
  },
  seed_corn: {
    id: 'seed_corn',
    name: 'Sementes de milho',
    icon: '🌱',
    stackable: true,
    usable: false,
  },
  seed_pumpkin: {
    id: 'seed_pumpkin',
    name: 'Sementes de abóbora',
    icon: '🌱',
    stackable: true,
    usable: false,
  },
  seed_strawberry: {
    id: 'seed_strawberry',
    name: 'Sementes de morango',
    icon: '🌱',
    stackable: true,
    usable: false,
  },
  pao_frances: {
    id: 'pao_frances',
    name: 'Pão francês',
    icon: '🍞',
    stackable: true,
    usable: true,
  },
  bolo_fuba: { id: 'bolo_fuba', name: 'Bolo de fubá', icon: '🎂', stackable: true, usable: true },
  basket: {
    id: 'basket',
    name: 'Cesta',
    icon: '🧺',
    stackable: false,
    usable: true,
    isContainer: true,
    containerSize: 9,
  },
};

export interface SlotItem {
  id: ItemId;
  qty: number;
}

export const INVENTORY_SIZE = 12;
const STACK_MAX = 99;

export const HOME_CHEST_ID = 'home_chest';

export interface Container {
  id: string;
  name: string;
  capacity: number;
  slots: (SlotItem | null)[];
}

export interface UseItemResult {
  effect: 'consumed' | 'opened_container' | 'cannot_use';
  itemId: ItemId;
  success: boolean;
}

export interface InventoryState {
  slots: (SlotItem | null)[];
  gold: number;
  containers: Record<string, Container>;
  activeContainerId: string | null;
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
  /** Use the item at slotIndex. Consumables are removed; containers open a panel. */
  useItem: (slotIndex: number) => UseItemResult | null;
  openContainer: (containerId: string) => void;
  closeContainer: () => void;
  /** Move qty from a player slot into a container. Returns false if container is full. */
  transferToContainer: (containerId: string, slotIndex: number, qty: number) => boolean;
  /** Move qty from a container slot back into the player inventory. Returns false if inventory is full. */
  retrieveFromContainer: (containerId: string, containerSlotIndex: number, qty: number) => boolean;
}

function makeContainers(): Record<string, Container> {
  return {
    [HOME_CHEST_ID]: {
      id: HOME_CHEST_ID,
      name: 'Baú da casa',
      capacity: 20,
      slots: new Array<SlotItem | null>(20).fill(null),
    },
  };
}

function makeInitial(): InventoryState {
  const slots: (SlotItem | null)[] = new Array<SlotItem | null>(INVENTORY_SIZE).fill(null);
  slots[0] = { id: 'seed_wheat', qty: 6 };
  slots[1] = { id: 'seed_tomato', qty: 4 };
  return { slots, gold: 500, containers: makeContainers(), activeContainerId: null };
}

/** Shared stacking logic: fills existing stacks, then empty slots. Returns [newSlots, remaining]. */
function stackAdd(
  slots: (SlotItem | null)[],
  id: ItemId,
  qty: number,
): [(SlotItem | null)[], number] {
  let remaining = qty;
  const result = [...slots];
  for (let i = 0; i < result.length && remaining > 0; i++) {
    const s = result[i];
    if (s && s.id === id && s.qty < STACK_MAX) {
      const room = STACK_MAX - s.qty;
      const drop = Math.min(remaining, room);
      result[i] = { ...s, qty: s.qty + drop };
      remaining -= drop;
    }
  }
  for (let i = 0; i < result.length && remaining > 0; i++) {
    if (result[i] === null) {
      const drop = Math.min(remaining, STACK_MAX);
      result[i] = { id, qty: drop };
      remaining -= drop;
    }
  }
  return [result, remaining];
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  ...makeInitial(),

  add: (id, qty) => {
    if (qty <= 0) return true;
    const [slots, remaining] = stackAdd(get().slots, id, qty);
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

  useItem: (slotIndex) => {
    const slots = [...get().slots];
    const slot = slots[slotIndex];
    if (!slot) return null;

    const def = ITEM_DEFS[slot.id];
    if (!def?.usable) return { effect: 'cannot_use', itemId: slot.id, success: false };

    if (def.isContainer) {
      const containerId = `basket_slot${slotIndex}`;
      const containers = { ...get().containers };
      if (!containers[containerId]) {
        containers[containerId] = {
          id: containerId,
          name: def.name,
          capacity: def.containerSize ?? 9,
          slots: new Array<SlotItem | null>(def.containerSize ?? 9).fill(null),
        };
      }
      set({ containers, activeContainerId: containerId });
      return { effect: 'opened_container', itemId: slot.id, success: true };
    }

    // Consume one of the item
    slots[slotIndex] = slot.qty > 1 ? { ...slot, qty: slot.qty - 1 } : null;
    set({ slots });
    return { effect: 'consumed', itemId: slot.id, success: true };
  },

  openContainer: (containerId) => {
    if (get().containers[containerId]) set({ activeContainerId: containerId });
  },

  closeContainer: () => set({ activeContainerId: null }),

  transferToContainer: (containerId, slotIndex, qty) => {
    const { slots, containers } = get();
    const slot = slots[slotIndex];
    if (!slot) return false;
    const container = containers[containerId];
    if (!container) return false;

    const transferQty = Math.min(qty, slot.qty);
    const [newContainerSlots, remaining] = stackAdd(container.slots, slot.id, transferQty);
    if (remaining > 0) return false;

    const newPlayerSlots = [...slots];
    const leftover = slot.qty - transferQty;
    newPlayerSlots[slotIndex] = leftover === 0 ? null : { ...slot, qty: leftover };

    set({
      slots: newPlayerSlots,
      containers: { ...containers, [containerId]: { ...container, slots: newContainerSlots } },
    });
    return true;
  },

  retrieveFromContainer: (containerId, containerSlotIndex, qty) => {
    const { slots, containers } = get();
    const container = containers[containerId];
    if (!container) return false;
    const containerSlot = container.slots[containerSlotIndex];
    if (!containerSlot) return false;

    const retrieveQty = Math.min(qty, containerSlot.qty);
    const [newPlayerSlots, remaining] = stackAdd(slots, containerSlot.id, retrieveQty);
    if (remaining > 0) return false;

    const newContainerSlots = [...container.slots];
    const leftover = containerSlot.qty - retrieveQty;
    newContainerSlots[containerSlotIndex] =
      leftover === 0 ? null : { ...containerSlot, qty: leftover };

    set({
      slots: newPlayerSlots,
      containers: { ...containers, [containerId]: { ...container, slots: newContainerSlots } },
    });
    return true;
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __inv: typeof useInventoryStore }).__inv = useInventoryStore;
}
