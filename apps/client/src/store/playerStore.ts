import { create } from 'zustand';
import type { TileCoord } from '../engine/world/WorldGrid';

export interface PlayerState {
  /** World-space position (continuous, not tile-snapped). */
  position: { x: number; y: number; z: number };
  /** Queued waypoints from click-to-move (consumed by PlayerController). */
  path: TileCoord[];
  /** Movement speed in tiles per second. */
  speed: number;
  /** Number of dialogue interactions per NPC id. */
  interactionCount: Record<string, number>;
  /** Relationship level (0–10) per NPC id, raised by quest completion and gifts. */
  heartLevel: Record<string, number>;
}

export interface PlayerActions {
  setPosition: (p: PlayerState['position']) => void;
  setPath: (path: TileCoord[]) => void;
  consumeWaypoint: () => void;
  clearPath: () => void;
  /** Increment interaction count for an NPC; called each time dialogue opens. */
  recordInteraction: (npcId: string) => void;
  /** Raise heart level for an NPC by the given amount (capped at 10). */
  raiseHeartLevel: (npcId: string, amount?: number) => void;
  /** Return dialogue context for the pipeline's classifyContext(). */
  getDialogueContext: (npcId: string) => { interactionCount: number; heartLevel: number };
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  position: { x: 0, y: 0, z: 0 },
  path: [],
  speed: 4,
  interactionCount: {},
  heartLevel: {},
  setPosition: (position) => set({ position }),
  setPath: (path) => set({ path }),
  consumeWaypoint: () => set((s) => ({ path: s.path.length > 0 ? s.path.slice(1) : s.path })),
  clearPath: () => set({ path: [] }),
  recordInteraction: (npcId) =>
    set((s) => ({
      interactionCount: {
        ...s.interactionCount,
        [npcId]: (s.interactionCount[npcId] ?? 0) + 1,
      },
    })),
  raiseHeartLevel: (npcId, amount = 1) =>
    set((s) => ({
      heartLevel: {
        ...s.heartLevel,
        [npcId]: Math.min(10, (s.heartLevel[npcId] ?? 0) + amount),
      },
    })),
  getDialogueContext: (npcId) => ({
    interactionCount: get().interactionCount[npcId] ?? 0,
    heartLevel: get().heartLevel[npcId] ?? 0,
  }),
}));

if (import.meta.env.DEV) {
  // Expose store on window for manual testing and e2e probes
  (window as unknown as { __player: typeof usePlayerStore }).__player = usePlayerStore;
}
