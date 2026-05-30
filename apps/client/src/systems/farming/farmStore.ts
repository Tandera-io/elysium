import { create } from 'zustand';
import { CROPS, isInSeason, type CropId } from './CropDefs';
import { tileKey } from '../../engine/world/pathfinding';
import type { TileCoord } from '../../engine/world/WorldGrid';
import type { Season } from '../time/timeStore';

export type TileState =
  | { kind: 'empty' }
  | { kind: 'tilled'; tilledOnDay: number; watered: boolean }
  | {
      kind: 'planted';
      crop: CropId;
      plantedOnDay: number;
      lastWateredOnDay: number;
      daysGrown: number;
      /** Season in which the crop was planted — used for wilt checks. */
      seasonPlanted: Season;
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
  /**
   * Plant a crop. When `currentSeason` is provided the crop must be in-season
   * or the call returns false. Omit in tests or when season checks are not
   * applicable (e.g. sandbox/dev scenarios).
   */
  plant: (t: TileCoord, crop: CropId, currentSeason?: Season) => boolean;
  /** Returns the yielded item id and quantity, or null if nothing to harvest. */
  harvest: (t: TileCoord) => { crop: CropId; quantity: number } | null;
  /**
   * Harvest all mature tiles at once. Returns array of yields.
   * Used by HarvestMenu's "Colher tudo" button.
   */
  harvestAll: () => Array<{ crop: CropId; quantity: number }>;
  /**
   * Advances day counter and progresses planted tiles by 1 day.
   * When `currentSeason` is provided, out-of-season crops wilt.
   * Rainy weather auto-waters all tilled+planted tiles.
   * Stormy weather suppresses growth for that day.
   */
  advanceDay: (currentSeason?: Season, weather?: 'sunny' | 'cloudy' | 'rainy' | 'stormy') => void;
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
  plant: (t, crop, currentSeason) => {
    const key = tileKey(t);
    const cur = get().tiles[key];
    if (!cur || cur.kind !== 'tilled') return false;
    const def = CROPS[crop];
    if (currentSeason !== undefined && !isInSeason(def, currentSeason)) return false;
    set((s) => ({
      tiles: {
        ...s.tiles,
        [key]: {
          kind: 'planted',
          crop,
          plantedOnDay: s.day,
          lastWateredOnDay: cur.watered ? s.day : s.day - 1,
          daysGrown: 0,
          seasonPlanted: currentSeason ?? 'spring',
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
    const results: Array<{ crop: CropId; quantity: number }> = [];
    set((s) => {
      const nextTiles = { ...s.tiles };
      for (const [k, t] of Object.entries(s.tiles)) {
        if (t.kind !== 'planted') continue;
        const def = CROPS[t.crop];
        if (t.daysGrown < def.daysToMature) continue;
        results.push({ crop: t.crop, quantity: def.yieldQuantity });
        nextTiles[k] = { kind: 'tilled', tilledOnDay: s.day, watered: false };
      }
      return { tiles: nextTiles };
    });
    return results;
  },
  advanceDay: (currentSeason, weather = 'sunny') => {
    const isRainy = weather === 'rainy';
    const isStormy = weather === 'stormy';

    set((s) => {
      const nextDay = s.day + 1;
      const nextTiles: Record<string, TileState> = {};

      for (const [k, t] of Object.entries(s.tiles)) {
        if (t.kind === 'tilled') {
          // Rain auto-waters tilled tiles
          nextTiles[k] = isRainy ? { ...t, watered: true } : t;
          continue;
        }

        if (t.kind === 'planted') {
          const def = CROPS[t.crop];

          // Out-of-season crops wilt → revert to tilled soil (only when season is known)
          if (currentSeason !== undefined && !isInSeason(def, currentSeason)) {
            nextTiles[k] = { kind: 'tilled', tilledOnDay: s.day, watered: false };
            continue;
          }

          // Rain auto-waters planted tiles
          const effectiveWatered = isRainy ? true : t.lastWateredOnDay >= s.day;

          // Stormy weather suppresses growth; un-watered also suppresses
          const grows = effectiveWatered && !isStormy;
          const nextLastWatered = isRainy ? nextDay : t.lastWateredOnDay;

          nextTiles[k] = {
            ...t,
            daysGrown: grows ? t.daysGrown + 1 : t.daysGrown,
            lastWateredOnDay: nextLastWatered,
          };
          continue;
        }

        // empty — should not appear in tiles map but handle defensively
        nextTiles[k] = t;
      }

      return { day: nextDay, tiles: nextTiles };
    });
  },
  reset: () => set({ tiles: {}, day: 1 }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __farm: typeof useFarmStore }).__farm = useFarmStore;
}
