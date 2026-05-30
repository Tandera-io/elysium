/**
 * useFarmState — hook layer over farmStore for grid-UI components.
 *
 * Provides a flat list of FarmPlot objects corresponding to a fixed grid, plus
 * convenience actions (till+plant in one step, harvest with inventory credit)
 * that FarmGrid can call directly.
 *
 * The underlying truth lives in `useFarmStore`; this file just re-shapes it for
 * 2-D grid rendering and wires in the inventory / time stores.
 */

import { useFarmStore, type TileState } from '../systems/farming/farmStore';
import { useInventoryStore, type ItemId } from '../systems/inventory/inventoryStore';
import { CROPS, isMature, stageForDayCount, type CropId } from '../systems/farming/CropDefs';
import { useTimeStore, SEASONS } from '../systems/time/timeStore';
import type { TileCoord } from '../engine/world/WorldGrid';

// ─── Grid config ────────────────────────────────────────────────────────────

export const FARM_GRID_COLS = 5;
export const FARM_GRID_ROWS = 4;

/** Build the ordered list of tile coordinates for the farm grid UI. */
export function farmGridCoords(): TileCoord[] {
  const out: TileCoord[] = [];
  for (let row = 0; row < FARM_GRID_ROWS; row++) {
    for (let col = 0; col < FARM_GRID_COLS; col++) {
      out.push({ x: col, z: row });
    }
  }
  return out;
}

// ─── Derived per-plot type ───────────────────────────────────────────────────

export type PlotStatus = 'empty' | 'tilled' | 'growing' | 'ready';

export interface FarmPlot {
  /** Tile coordinate in the world grid. */
  coord: TileCoord;
  /** Simplified status for UI rendering. */
  status: PlotStatus;
  /** Present when status is 'growing' or 'ready'. */
  cropId?: CropId;
  cropName?: string;
  /** 0-based stage index (into CropDef.stages). */
  stageIndex?: number;
  /** CSS hex color for the current stage. */
  stageColor?: string;
  /** 0..1 progress toward maturity. */
  growthProgress?: number;
  /** Days grown so far. */
  daysGrown?: number;
  /** Days needed to mature. */
  daysToMature?: number;
  /** Whether tilled soil has been watered. */
  watered?: boolean;
}

// ─── Derived helper ──────────────────────────────────────────────────────────

function derivePlot(coord: TileCoord, tile: TileState): FarmPlot {
  if (tile.kind === 'empty') {
    return { coord, status: 'empty' };
  }
  if (tile.kind === 'tilled') {
    return { coord, status: 'tilled', watered: tile.watered };
  }
  // planted
  const def = CROPS[tile.crop];
  const mature = isMature(def, tile.daysGrown);
  const stage = stageForDayCount(def, tile.daysGrown);
  return {
    coord,
    status: mature ? 'ready' : 'growing',
    cropId: tile.crop,
    cropName: def.name,
    stageIndex: stage.index,
    stageColor: stage.color,
    growthProgress: Math.min(1, tile.daysGrown / def.daysToMature),
    daysGrown: tile.daysGrown,
    daysToMature: def.daysToMature,
    watered: tile.lastWateredOnDay >= useFarmStore.getState().day - 1,
  };
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export interface UseFarmStateReturn {
  /** Ordered flat list of plots (row-major, FARM_GRID_COLS wide). */
  plots: FarmPlot[];
  /** Current game day. */
  day: number;
  /** Current season label key. */
  season: string;

  /**
   * Till an empty plot, then immediately plant a seed.
   * Consumes one seed from inventory.
   * Returns true on success.
   */
  quickPlant: (coord: TileCoord, crop: CropId) => boolean;

  /**
   * Till an empty plot.
   */
  tillPlot: (coord: TileCoord) => boolean;

  /**
   * Plant a crop on an already-tilled plot.
   * Consumes one seed from inventory.
   */
  plantCrop: (coord: TileCoord, crop: CropId) => boolean;

  /**
   * Water a tilled or planted plot.
   */
  waterPlot: (coord: TileCoord) => boolean;

  /**
   * Harvest a ready plot, crediting inventory.
   * Returns harvest info or null.
   */
  harvestPlot: (coord: TileCoord) => { crop: CropId; quantity: number } | null;
}

export function useFarmState(): UseFarmStateReturn {
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const season = SEASONS[seasonIndex] ?? 'spring';

  const coords = farmGridCoords();

  const plots: FarmPlot[] = coords.map((coord) => {
    const key = `${coord.x},${coord.z}`;
    const tile = tiles[key] ?? { kind: 'empty' as const };
    return derivePlot(coord, tile);
  });

  function tillPlot(coord: TileCoord): boolean {
    return useFarmStore.getState().till(coord);
  }

  function plantCrop(coord: TileCoord, crop: CropId): boolean {
    const inv = useInventoryStore.getState();
    // Seed items follow the pattern seed_<cropId>; fall back to bare cropId
    // for crops that don't have an explicit seed item (pumpkin, strawberry).
    const seedCandidates = [`seed_${crop}`, crop] as const;
    const seedItemId = seedCandidates.find((id) => inv.count(id as ItemId) > 0) as
      | ItemId
      | undefined;
    if (!seedItemId) return false;
    const ok = useFarmStore.getState().plant(coord, crop);
    if (ok) inv.remove(seedItemId, 1);
    return ok;
  }

  function quickPlant(coord: TileCoord, crop: CropId): boolean {
    const farm = useFarmStore.getState();
    const tileKey = `${coord.x},${coord.z}`;
    const tile = farm.tiles[tileKey] ?? { kind: 'empty' as const };
    if (tile.kind === 'empty') {
      if (!farm.till(coord)) return false;
    }
    return plantCrop(coord, crop);
  }

  function waterPlot(coord: TileCoord): boolean {
    return useFarmStore.getState().water(coord);
  }

  function harvestPlot(coord: TileCoord): { crop: CropId; quantity: number } | null {
    const result = useFarmStore.getState().harvest(coord);
    if (result) {
      useInventoryStore.getState().add(result.crop, result.quantity);
    }
    return result;
  }

  return { plots, day, season, quickPlant, tillPlot, plantCrop, waterPlot, harvestPlot };
}
