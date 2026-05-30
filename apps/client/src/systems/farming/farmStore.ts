import { create } from 'zustand';
import { CROPS, type CropId } from './CropDefs';
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
  /** Harvests all mature planted tiles and returns an array of yields. */
  harvestAll: () => Array<{ crop: CropId; quantity: number }>;
  /** Advances day counter and progresses planted tiles by 1 day. */
  advanceDay: () => void;
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
  harvestAll: () => {
    const { tiles, day } = get();
    const yields: Array<{ crop: CropId; quantity: number }> = [];
    const updatedTiles: Record<string, TileState> = { ...tiles };
    for (const [key, t] of Object.entries(tiles)) {
      if (t.kind !== 'planted') continue;
      const def = CROPS[t.crop];
      if (t.daysGrown < def.daysToMature) continue;
      yields.push({ crop: t.crop, quantity: def.yieldQuantity });
      updatedTiles[key] = { kind: 'tilled', tilledOnDay: day, watered: false };
    }
    if (yields.length > 0) {
      set({ tiles: updatedTiles });
    }
    return yields;
  },
  advanceDay: () => {
    set((s) => {
      const nextDay = s.day + 1;
      const nextTiles: Record<string, TileState> = { ...s.tiles };
      for (const [k, t] of Object.entries(s.tiles)) {
        if (t.kind === 'planted') {
          // For the MVP, planted tiles always grow one day. Phase 6 reintroduces
          // the daily-water requirement once the day cycle is real-time.
          nextTiles[k] = { ...t, daysGrown: t.daysGrown + 1 };
        }
      }
      return { day: nextDay, tiles: nextTiles };
    });
  },
  reset: () => set({ tiles: {}, day: 1 }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __farm: typeof useFarmStore }).__farm = useFarmStore;
}
