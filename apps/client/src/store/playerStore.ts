import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';
import { useTimeStore, WEATHER_DEFS } from '../systems/time/timeStore';

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Base movement speed in tiles per second (before weather modifiers). */
  speed: number;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  /**
   * Returns the effective movement speed after applying the current weather
   * multiplier. Use this in PlayerController instead of reading `speed` raw.
   */
  effectiveSpeed: () => number;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
  effectiveSpeed: () => {
    const { weather } = useTimeStore.getState();
    const multiplier = WEATHER_DEFS[weather.type].playerSpeedMultiplier;
    return get().speed * multiplier;
  },
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
