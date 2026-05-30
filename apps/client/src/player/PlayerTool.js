import { useToolStore } from '../store/toolStore';
import { useFarmStore } from '../systems/farming/farmStore';
import { useGroundItemStore } from '../systems/groundItems/groundItemStore';
import { inventory } from '../inventory/Inventory';

/** Maps tool id → crop id for seed tools. */
const SEED_TO_CROP = /** @type {Record<string, string>} */ ({
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
});

/**
 * Coordinates player tool actions — bridges inventory and farm systems.
 */
export class PlayerTool {
  /**
   * Apply the currently selected tool at the given tile.
   * Handles hoe, water, seed, and harvest tools.
   * Returns true if the action had an effect.
   * @param {{ x: number; z: number }} tileCoord
   * @returns {boolean}
   */
  apply(tileCoord) {
    const tool = useToolStore.getState().current;
    const farm = useFarmStore.getState();

    if (tool === 'hoe') return farm.till(tileCoord);
    if (tool === 'water') return farm.water(tileCoord);

    if (tool === 'harvest') {
      const yieldVal = farm.harvest(tileCoord);
      if (!yieldVal) return false;
      inventory.pickup(yieldVal.crop, yieldVal.quantity);
      return true;
    }

    const cropId = SEED_TO_CROP[tool];
    if (cropId) return this.plantSeed(tool, cropId, tileCoord);

    return false;
  }

  /**
   * Consume one seed from inventory and plant it at tileCoord.
   * @param {string} seedItemId
   * @param {string} cropId
   * @param {{ x: number; z: number }} tileCoord
   * @returns {boolean}
   */
  plantSeed(seedItemId, cropId, tileCoord) {
    if (!inventory.hasItem(seedItemId)) return false;
    const farm = useFarmStore.getState();
    if (!farm.plant(tileCoord, cropId)) return false;
    inventory.use(seedItemId, 1);
    return true;
  }

  /**
   * Pick up a ground item, adding its contents to the player's inventory.
   * @param {{ id: string; itemId: string; qty: number }} groundItem
   * @returns {boolean}
   */
  pickupGroundItem(groundItem) {
    const groundItems = useGroundItemStore.getState();
    const removed = groundItems.removeItem(groundItem.id);
    if (!removed) return false;
    return inventory.pickup(removed.itemId, removed.qty);
  }
}

export const playerTool = new PlayerTool();
