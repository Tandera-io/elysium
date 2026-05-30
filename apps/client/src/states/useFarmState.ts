import { useFarmStore, type TileState } from '../systems/farming/farmStore';
import { useInventoryStore, type ItemId } from '../systems/inventory/inventoryStore';
import { CROPS, isMature, stageForDayCount, type CropId } from '../systems/farming/CropDefs';
import { useTimeStore, SEASONS } from '../systems/time/timeStore';
import type { TileCoord } from '../engine/world/WorldGrid';

export const FARM_GRID_COLS = 5;
export const FARM_GRID_ROWS = 4;

export function farmGridCoords(): TileCoord[] {
  const out: TileCoord[] = [];
  for (let row = 0; row < FARM_GRID_ROWS; row++) {
    for (let col = 0; col < FARM_GRID_COLS; col++) {
      out.push({ x: col, z: row });
    }
  }
  return out;
}

export type PlotStatus = 'empty' | 'tilled' | 'growing' | 'ready';

export interface FarmPlot {
  coord: TileCoord;
  status: PlotStatus;
  cropId?: CropId;
  cropName?: string;
  stageIndex?: number;
  stageColor?: string;
  growthProgress?: number;
  daysGrown?: number;
  daysToMature?: number;
  watered?: boolean;
}

const SEED_ITEM: Partial<Record<CropId, ItemId>> = {
  wheat: 'seed_wheat',
  tomato: 'seed_tomato',
  corn: 'seed_corn',
};

function derivePlot(coord: TileCoord, tile: TileState, today: number): FarmPlot {
  if (tile.kind === 'empty') return { coord, status: 'empty' };
  if (tile.kind === 'tilled') return { coord, status: 'tilled', watered: tile.watered };
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
    watered: tile.lastWateredOnDay >= today - 1,
  };
}

export interface UseFarmStateReturn {
  plots: FarmPlot[];
  day: number;
  season: string;
  tillPlot: (coord: TileCoord) => boolean;
  plantCrop: (coord: TileCoord, crop: CropId) => boolean;
  quickPlant: (coord: TileCoord, crop: CropId) => boolean;
  waterPlot: (coord: TileCoord) => boolean;
  harvestPlot: (coord: TileCoord) => { crop: CropId; quantity: number } | null;
}

export function useFarmState(): UseFarmStateReturn {
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const season = SEASONS[seasonIndex] ?? 'spring';

  const plots: FarmPlot[] = farmGridCoords().map((coord) => {
    const tile: TileState = tiles[`${coord.x},${coord.z}`] ?? { kind: 'empty' as const };
    return derivePlot(coord, tile, day);
  });

  function tillPlot(coord: TileCoord): boolean {
    return useFarmStore.getState().till(coord);
  }

  function plantCrop(coord: TileCoord, crop: CropId): boolean {
    const inv = useInventoryStore.getState();
    const seedId = SEED_ITEM[crop];
    if (seedId !== undefined && inv.count(seedId) <= 0) return false;
    const ok = useFarmStore.getState().plant(coord, crop);
    if (ok && seedId !== undefined) inv.remove(seedId, 1);
    return ok;
  }

  function quickPlant(coord: TileCoord, crop: CropId): boolean {
    const farm = useFarmStore.getState();
    const tile = farm.tiles[`${coord.x},${coord.z}`] ?? { kind: 'empty' as const };
    if (tile.kind === 'empty' && !farm.till(coord)) return false;
    return plantCrop(coord, crop);
  }

  function waterPlot(coord: TileCoord): boolean {
    return useFarmStore.getState().water(coord);
  }

  function harvestPlot(coord: TileCoord): { crop: CropId; quantity: number } | null {
    const result = useFarmStore.getState().harvest(coord);
    if (result) useInventoryStore.getState().add(result.crop, result.quantity);
    return result;
  }

  return { plots, day, season, tillPlot, plantCrop, quickPlant, waterPlot, harvestPlot };
}
