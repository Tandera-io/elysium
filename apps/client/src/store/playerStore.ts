import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';
import type { ItemId } from '../systems/inventory/inventoryStore';

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
  /**
   * The item the player is currently holding/has selected for use.
   * Synced from the inventory selectedSlot by callers or UI.
   * null means bare-hands / no active item.
   */
  heldItem: ItemId | null;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  /**
   * Pick up (equip) an item — sets heldItem.
   * Call this when a player selects an inventory slot.
   */
  pickUp: (id: ItemId) => void;
  /**
   * Drop / unequip the currently held item — clears heldItem.
   */
  dropItem: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  heldItem: null,
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
  pickUp: (id) => set({ heldItem: id }),
  dropItem: () => set({ heldItem: null }),
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
