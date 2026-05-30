/**
 * PlayerInteractions — keyboard-driven farming interactions.
 *
 * Press E to interact with the farm tile under the player:
 *   UNPLOWED → plow it (till)
 *   PLOWED   → plant the active seed from inventory
 *
 * Call mountFarmingInteractions() once on app start. It returns an
 * unmount function to clean up the listener.
 */

import { usePlayerStore } from '../store/playerStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { plowPlot, plantSeed, getPlotState, PlotState } from '../farming/FarmPlot';

/** Ordered list of seed item ids → crop ids tried when planting. */
const SEED_PRIORITY = [
  { itemId: 'seed_wheat', cropId: 'wheat' },
  { itemId: 'seed_tomato', cropId: 'tomato' },
  { itemId: 'seed_corn', cropId: 'corn' },
];

/**
 * Attempt a farming interaction at the player's current world position.
 * Returns a description of what happened, or null if nothing was done.
 * @returns {string | null}
 */
export function tryFarmInteraction() {
  const { position } = usePlayerStore.getState();
  const tile = worldToTile({ x: position.x, z: position.z });
  const state = getPlotState(tile);

  if (state === PlotState.UNPLOWED) {
    const ok = plowPlot(tile);
    return ok ? 'plowed' : null;
  }

  if (state === PlotState.PLOWED) {
    const inventory = useInventoryStore.getState();
    for (const { itemId, cropId } of SEED_PRIORITY) {
      if (inventory.count(itemId) > 0) {
        const ok = plantSeed(tile, cropId);
        if (ok) {
          inventory.remove(itemId, 1);
          return `planted:${cropId}`;
        }
      }
    }
    return null; // no seeds available
  }

  return null;
}

/**
 * Mount a global keydown listener that calls tryFarmInteraction() on KeyE.
 * @returns {() => void} cleanup function
 */
export function mountFarmingInteractions() {
  function onKeyDown(e) {
    if (e.code === 'KeyE') {
      tryFarmInteraction();
    }
  }

  globalThis.addEventListener('keydown', onKeyDown);
  return () => globalThis.removeEventListener('keydown', onKeyDown);
}
