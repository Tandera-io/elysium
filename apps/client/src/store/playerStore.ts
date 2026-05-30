import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';

// ---------------------------------------------------------------------------
// Inventory types
// ---------------------------------------------------------------------------

export interface InventoryItem {
  /** Unique item identifier (e.g. "seed_wheat", "tomato"). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** How many of this item are stacked in the slot. */
  quantity: number;
  /** Optional explicit icon path/data-URL. Leave empty to use built-in icons. */
  iconPath?: string;
}

/** Fixed number of inventory slots available to the player. */
export const PLAYER_INVENTORY_SIZE = 8;

// ---------------------------------------------------------------------------
// Farming tool selection
// ---------------------------------------------------------------------------

export type FarmingTool = 'hoe' | 'watering_can' | 'seed' | 'scythe' | null;

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
  /** Player inventory — fixed-size array of nullable slots. */
  inventory: (InventoryItem | null)[];
  /** Active farming tool; null when not in farming mode. */
  farmingTool: FarmingTool;
  /** Crop selected to plant when farmingTool === 'seed'. */
  selectedCrop: string | null;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  /**
   * Add `qty` units of `item` to the inventory.
   * Stacks with an existing slot of the same id first; fills first empty slot
   * otherwise. Returns `false` if the inventory is full.
   */
  addItem: (item: Omit<InventoryItem, 'quantity'>, qty?: number) => boolean;
  /**
   * Remove `qty` units of `itemId` from the inventory, draining across stacks.
   * Returns `false` if there are insufficient units.
   */
  removeItem: (itemId: string, qty?: number) => boolean;
  /**
   * Convenience wrapper — removes exactly 1 unit of `itemId`.
   * Delegates to `removeItem`.
   */
  useItem: (itemId: string) => boolean;
  setFarmingTool: (tool: FarmingTool) => void;
  setSelectedCrop: (crop: string | null) => void;
}

/** Derived getter: effective speed (can be extended with buffs/debuffs later). */
export function effectiveSpeed(state: PlayerState): number {
  return state.speed;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  inventory: Array<InventoryItem | null>(PLAYER_INVENTORY_SIZE).fill(null),
  farmingTool: null,
  selectedCrop: null,

  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),

  addItem: (itemBase, qty = 1) => {
    const inventory = get().inventory.slice() as (InventoryItem | null)[];

    // 1. Try to stack onto an existing slot with the same id
    for (let i = 0; i < inventory.length; i++) {
      const slot = inventory[i];
      if (slot && slot.id === itemBase.id) {
        inventory[i] = { ...slot, quantity: slot.quantity + qty };
        set({ inventory });
        return true;
      }
    }

    // 2. Find first empty slot
    const emptyIdx = inventory.findIndex((s) => s === null);
    if (emptyIdx === -1) return false;

    inventory[emptyIdx] = { ...itemBase, quantity: qty };
    set({ inventory });
    return true;
  },

  removeItem: (itemId, qty = 1) => {
    const inventory = get().inventory.slice() as (InventoryItem | null)[];

    // Count total available
    const total = inventory.reduce(
      (sum, slot) => sum + (slot && slot.id === itemId ? slot.quantity : 0),
      0,
    );
    if (total < qty) return false;

    let remaining = qty;
    for (let i = 0; i < inventory.length && remaining > 0; i++) {
      const slot = inventory[i];
      if (slot && slot.id === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity;
          inventory[i] = null;
        } else {
          inventory[i] = { ...slot, quantity: slot.quantity - remaining };
          remaining = 0;
        }
      }
    }

    set({ inventory });
    return true;
  },

  useItem: (itemId) => get().removeItem(itemId, 1),

  setFarmingTool: (farmingTool) => set({ farmingTool }),
  setSelectedCrop: (selectedCrop) => set({ selectedCrop }),
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
