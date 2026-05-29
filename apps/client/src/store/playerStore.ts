import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
  /** Current energy (0–100). Depletes on farming/fishing/mining actions. */
  energy: number;
  /** Maximum energy cap. */
  maxEnergy: number;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  /** Drain `amount` energy. Returns true if player had enough energy (>0 before drain). */
  drainEnergy: (amount: number) => boolean;
  /** Restore `amount` energy, clamped to maxEnergy. */
  restoreEnergy: (amount: number) => void;
  /** Called on each in-game day tick — drains 10 pts of energy. */
  drainPerDayTick: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  energy: 100,
  maxEnergy: 100,
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
  drainEnergy: (amount) => {
    const { energy } = get();
    if (energy <= 0) return false;
    set({ energy: Math.max(0, energy - amount) });
    return true;
  },
  restoreEnergy: (amount) => {
    set((s) => ({ energy: Math.min(s.maxEnergy, s.energy + amount) }));
  },
  drainPerDayTick: () => {
    set((s) => ({ energy: Math.max(0, s.energy - 10) }));
  },
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
