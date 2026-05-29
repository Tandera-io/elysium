import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';

/**
 * Player starting position on the fazenda (farm).
 * Placed a few tiles south-west of Dorinha's shop stall so the player
 * spawns within easy walking distance of the NPC interaction zone.
 */
export const FAZENDA_SPAWN = { x: 3, y: 0, z: 6 } as const;

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  position: { ...FAZENDA_SPAWN },
  path: [],
  speed: 4,
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
