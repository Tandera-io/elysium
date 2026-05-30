/**
 * useCropGrowth — integrates farmStore + inventoryStore so that:
 *   - planting consumes a seed from inventory
 *   - harvesting adds the produce to inventory
 *
 * This is the canonical action layer for player farming interactions.
 */
import type { TileCoord } from '../../engine/world/WorldGrid';
import { useFarmStore } from './farmStore';
import { useInventoryStore } from '../inventory/inventoryStore';
import { CROPS, isMature, stageForDayCount, type CropId } from './CropDefs';
import type { TileState } from './farmStore';

const SEED_FOR_CROP: Record<CropId, 'seed_wheat' | 'seed_tomato' | 'seed_corn'> = {
  wheat: 'seed_wheat',
  tomato: 'seed_tomato',
  corn: 'seed_corn',
  pumpkin: 'seed_wheat', // fallback — pumpkin seeds share wheat bag in MVP
  strawberry: 'seed_tomato', // fallback
};

export interface CropGrowthActions {
  /**
   * Till → already tilled → plant. Consumes one seed from inventory.
   * Returns true if planting succeeded.
   */
  till: (t: TileCoord) => boolean;
  water: (t: TileCoord) => boolean;
  /**
   * Plant a seed on a tilled tile. Consumes one seed from inventory.
   * Returns true if planting succeeded.
   */
  plant: (t: TileCoord, crop: CropId) => boolean;
  /**
   * Harvest a mature crop and add produce to inventory.
   * Returns the yield item id and quantity, or null if not harvestable.
   */
  harvest: (t: TileCoord) => { crop: CropId; quantity: number } | null;
  getTile: (t: TileCoord) => TileState;
  isReady: (t: TileCoord) => boolean;
  stageLabel: (t: TileCoord) => string;
}

export function useCropGrowth(): CropGrowthActions {
  const farm = useFarmStore();
  const inv = useInventoryStore();

  return {
    till: (t) => farm.till(t),
    water: (t) => farm.water(t),

    plant: (t, crop) => {
      const seedId = SEED_FOR_CROP[crop];
      if (inv.count(seedId) < 1) return false;
      const ok = farm.plant(t, crop);
      if (ok) inv.remove(seedId, 1);
      return ok;
    },

    harvest: (t) => {
      const result = farm.harvest(t);
      if (!result) return null;
      inv.add(result.crop, result.quantity);
      return result;
    },

    getTile: (t) => farm.getTile(t),

    isReady: (t) => {
      const tile = farm.getTile(t);
      if (tile.kind !== 'planted') return false;
      return isMature(CROPS[tile.crop], tile.daysGrown);
    },

    stageLabel: (t) => {
      const tile = farm.getTile(t);
      if (tile.kind === 'empty') return 'empty';
      if (tile.kind === 'tilled') return 'tilled';
      const crop = CROPS[tile.crop];
      if (isMature(crop, tile.daysGrown)) return 'ready';
      const stage = stageForDayCount(crop, tile.daysGrown);
      const names = ['seed', 'sprout', 'growing', 'mature'] as const;
      return names[stage.index] ?? 'growing';
    },
  };
}
