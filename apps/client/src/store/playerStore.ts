import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
  /** Whether the crafting menu is open. */
  craftingMenuOpen: boolean;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  setCraftingMenuOpen: (open: boolean) => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  craftingMenuOpen: false,
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
  setCraftingMenuOpen: (open) => set({ craftingMenuOpen: open }),
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
