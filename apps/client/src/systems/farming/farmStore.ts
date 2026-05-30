import { create } from 'zustand';
import { CROPS, isOutOfSeason, type CropId, type Season } from './CropDefs';
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
      seasonPlanted: Season;
    };

export interface FarmState {
  tiles: Record<string, TileState>;
  day: number;
}

export interface FarmActions {
  getTile: (t: TileCoord) => TileState;
  till: (t: TileCoord) => boolean;
  water: (t: TileCoord) => boolean;
  plant: (t: TileCoord, crop: CropId, season: Season) => boolean;
  harvest: (t: TileCoord) => { crop: CropId; quantity: number } | null;
  advanceDay: (season: Season) => void;
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
  plant: (t, crop, season) => {
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
          seasonPlanted: season,
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
  advanceDay: (season) => {
    set((s) => {
      const nextDay = s.day + 1;
      const nextTiles: Record<string, TileState> = {};
      for (const [k, t] of Object.entries(s.tiles)) {
        if (t.kind === 'tilled') {
          nextTiles[k] = { ...t, watered: false };
        } else if (t.kind === 'planted') {
          if (isOutOfSeason(t.crop, season)) {
            nextTiles[k] = { kind: 'empty' };
          } else if (t.lastWateredOnDay >= s.day) {
            nextTiles[k] = { ...t, daysGrown: t.daysGrown + 1 };
          } else {
            nextTiles[k] = t;
          }
        } else {
          nextTiles[k] = t;
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
