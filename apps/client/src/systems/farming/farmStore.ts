import { create } from 'zustand';
import { CROPS, stageForDayCount, type CropId } from './CropDefs';
import { tileKey } from '../../engine/world/pathfinding';
import type { TileCoord } from '../../engine/world/WorldGrid';

export type TileState =
  | { kind: 'empty' }
  | { kind: 'tilled'; tilledOnDay: number; watered: boolean }
  | {
      kind: 'planted';
      crop: CropId;
      plantedOnDay: number;
      lastWateredOnDay: number;
      daysGrown: number;
      /** Current growth stage index, derived from daysGrown and CropDef stages. */
      growthStage: number;
    };

export interface FarmState {
  /** Map of tileKey(x,z) → TileState. Missing = empty. */
  tiles: Record<string, TileState>;
  /** Game day counter — bumped by advanceDay(). */
  day: number;
}

export interface FarmActions {
  getTile: (t: TileCoord) => TileState;
  till: (t: TileCoord) => boolean;
  water: (t: TileCoord) => boolean;
  plant: (t: TileCoord, crop: CropId) => boolean;
  /** Returns the yielded item id and quantity, or null if nothing to harvest. */
  harvest: (t: TileCoord) => { crop: CropId; quantity: number } | null;
  /** Advances day counter and progresses planted tiles by 1 day. */
  advanceDay: () => void;
  /** Returns the current growth stage index (0-based) for a planted tile, or -1. */
  getGrowthStage: (t: TileCoord) => number;
  /** Test helpers */
  reset: () => void;
}

const EMPTY: TileState = { kind: 'empty' };

export const useFarmStore = create<FarmState & FarmActions>((set, get) => ({
  tiles: {},
  day: 1,
  getTile: (t) => get().tiles[tileKey(t)] ?? EMPTY,
  till: (t) => {
    const key = tileKey(t);
    const cur = get().tiles[key] ?? EMPTY;
    if (cur.kind !== 'empty') return false;
    set((s) => ({
      tiles: { ...s.tiles, [key]: { kind: 'tilled', tilledOnDay: s.day, watered: false } },
    }));
    return true;
  },
  water: (t) => {
    const key = tileKey(t);
    const cur = get().tiles[key];
    if (!cur) return false;
    if (cur.kind === 'tilled') {
      set((s) => ({ tiles: { ...s.tiles, [key]: { ...cur, watered: true } } }));
      return true;
    }
    if (cur.kind === 'planted') {
      set((s) => ({ tiles: { ...s.tiles, [key]: { ...cur, lastWateredOnDay: s.day } } }));
      return true;
    }
    return false;
  },
  plant: (t, crop) => {
    const key = tileKey(t);
    const cur = get().tiles[key];
    if (!cur || cur.kind !== 'tilled') return false;
    set((s) => ({
      tiles: {
        ...s.tiles,
        [key]: {
          kind: 'planted',
          crop,
          plantedOnDay: s.day,
          lastWateredOnDay: cur.watered ? s.day : s.day - 1,
          daysGrown: 0,
          growthStage: 0,
        },
      },
    }));
    return true;
  },
  harvest: (t) => {
    const key = tileKey(t);
    const cur = get().tiles[key];
    if (!cur || cur.kind !== 'planted') return null;
    const def = CROPS[cur.crop];
    if (cur.daysGrown < def.daysToMature) return null;
    set((s) => ({
      tiles: { ...s.tiles, [key]: { kind: 'tilled', tilledOnDay: s.day, watered: false } },
    }));
    return { crop: cur.crop, quantity: def.yieldQuantity };
  },
  advanceDay: () => {
    set((s) => {
      const nextDay = s.day + 1;
      const nextTiles: Record<string, TileState> = { ...s.tiles };
      for (const [k, t] of Object.entries(s.tiles)) {
        if (t.kind === 'planted') {
          // For the MVP, planted tiles always grow one day. Phase 6 reintroduces
          // the daily-water requirement once the day cycle is real-time.
          const newDaysGrown = t.daysGrown + 1;
          const def = CROPS[t.crop];
          const newGrowthStage = stageForDayCount(def, newDaysGrown).index;
          nextTiles[k] = { ...t, daysGrown: newDaysGrown, growthStage: newGrowthStage };
        }
      }
      return { day: nextDay, tiles: nextTiles };
    });
  },
  getGrowthStage: (t) => {
    const cur = get().tiles[tileKey(t)];
    if (!cur || cur.kind !== 'planted') return -1;
    return cur.growthStage;
  },
  reset: () => set({ tiles: {}, day: 1 }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __farm: typeof useFarmStore }).__farm = useFarmStore;
}
