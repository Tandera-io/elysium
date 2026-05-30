// apps/client/src/farming/Farm.js
//
// Farm — imperative JS facade over the Zustand farmStore.
//
// Non-React code (NPC scripts, quest callbacks, dialogue pipelines, Phaser
// scenes) can import this module and call methods directly without interacting
// with Zustand or React hooks.  Internally all state mutations delegate to
// `useFarmStore.getState()` so the reactive 3-D world (FarmField.tsx) and the
// imperative scripting layer share a single source of truth.
//
// Grid coordinates use the same {x, z} TileCoord convention as the engine:
//   x → column (east)
//   z → row    (south)
//
// Exported surface:
//   Farm             — class managing a grid of crop plots
//   createFarm()     — singleton factory (lazy, cached)
//   getFarm()        — returns the cached Farm instance
//   farmAPI          — object exporting the same methods as Farm for
//                      functional / non-OOP callers

import { useFarmStore } from '../systems/farming/farmStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { Crop, CROP_DEFS } from './Crop.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Seed item id for a given crop id (e.g. 'wheat' → 'seed_wheat').
 *
 * @param {string} cropId
 * @returns {string}
 */
function seedId(cropId) {
  return `seed_${cropId}`;
}

// ---------------------------------------------------------------------------
// Farm class
// ---------------------------------------------------------------------------

export class Farm {
  // Farm is a thin façade — all persistent state lives in useFarmStore.
  // Methods here read/write that store so changes are reactive.

  // ---------------------------------------------------------------------------
  // Tile queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the raw TileState from the store for the given grid position.
   * Returns `{ kind: 'empty' }` when the tile has not been interacted with.
   *
   * @param {number} x
   * @param {number} z
   * @returns {{ kind: string, [key: string]: any }}
   */
  getPlot(x, z) {
    return useFarmStore.getState().getTile({ x, z });
  }

  /**
   * True when the tile at (x, z) has been tilled by the player.
   *
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  isTilled(x, z) {
    const plot = this.getPlot(x, z);
    return plot.kind === 'tilled' || plot.kind === 'planted';
  }

  /**
   * True when a crop is currently growing at (x, z).
   *
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  hasPlant(x, z) {
    return this.getPlot(x, z).kind === 'planted';
  }

  /**
   * Returns a `Crop` instance reflecting the current store state for the tile,
   * or null if no crop is planted there.
   *
   * @param {number} x
   * @param {number} z
   * @returns {Crop | null}
   */
  getCrop(x, z) {
    const plot = this.getPlot(x, z);
    if (plot.kind !== 'planted') return null;
    return new Crop({
      cropId: plot.crop,
      daysGrown: plot.daysGrown,
      plantedOnDay: plot.plantedOnDay,
      watered: plot.lastWateredOnDay >= useFarmStore.getState().day,
    });
  }

  // ---------------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------------

  /**
   * Till the plot at (x, z).
   * The tile must be empty; tilling an already-tilled plot fails.
   *
   * @param {number} x
   * @param {number} z
   * @returns {{ ok: boolean, reason?: string }}
   */
  till(x, z) {
    const ok = useFarmStore.getState().till({ x, z });
    if (!ok) return { ok: false, reason: 'Tile não pode ser lavrado agora.' };
    return { ok: true };
  }

  /**
   * Water the plot at (x, z).
   * Works on both tilled and planted tiles.
   *
   * @param {number} x
   * @param {number} z
   * @returns {{ ok: boolean, reason?: string }}
   */
  water(x, z) {
    const ok = useFarmStore.getState().water({ x, z });
    if (!ok) return { ok: false, reason: 'Nada para regar aqui.' };
    return { ok: true };
  }

  /**
   * Plant a crop at (x, z).
   *
   * Requires:
   *   - The tile to be tilled (not empty, not already planted).
   *   - The player inventory to contain at least one seed for the crop
   *     (`seed_<cropId>`).
   *   - The cropId to be a valid key in CROP_DEFS.
   *
   * On success, consumes one seed from the inventory.
   *
   * @param {number}  x
   * @param {number}  z
   * @param {string}  cropId  — e.g. 'wheat', 'tomato'
   * @param {{ consumeSeed?: boolean }} [opts]
   *   consumeSeed: default true — set false to bypass seed cost (cheats/tests).
   * @returns {{ ok: boolean, reason?: string }}
   */
  plantCrop(x, z, cropId, { consumeSeed = true } = {}) {
    if (!CROP_DEFS[cropId]) {
      return { ok: false, reason: `Tipo de cultura desconhecido: "${cropId}".` };
    }

    const plot = this.getPlot(x, z);
    if (plot.kind === 'empty') {
      return { ok: false, reason: 'O solo precisa ser lavrado primeiro.' };
    }
    if (plot.kind === 'planted') {
      return { ok: false, reason: 'Já existe uma plantação aqui.' };
    }

    if (consumeSeed) {
      const inv = useInventoryStore.getState();
      const seed = seedId(cropId);
      if (inv.count(seed) < 1) {
        const cropLabel = CROP_DEFS[cropId].name;
        return { ok: false, reason: `Sem sementes de ${cropLabel} no inventário.` };
      }
      inv.remove(seed, 1);
    }

    const ok = useFarmStore.getState().plant({ x, z }, cropId);
    if (!ok) {
      // Shouldn't happen given the checks above, but restore the seed if
      // the store rejected the plant action for an unexpected reason.
      if (consumeSeed) useInventoryStore.getState().add(seedId(cropId), 1);
      return { ok: false, reason: 'Não foi possível plantar aqui.' };
    }
    return { ok: true };
  }

  /**
   * Harvest the crop at (x, z) if it is mature.
   *
   * On success, adds the harvested items to the player inventory and returns
   * the yield.  The tile reverts to a tilled state ready for replanting.
   *
   * @param {number} x
   * @param {number} z
   * @param {{ addToInventory?: boolean }} [opts]
   *   addToInventory: default true — set false to skip inventory write (tests).
   * @returns {{ ok: boolean, itemId?: string, quantity?: number, reason?: string }}
   */
  harvestCrop(x, z, { addToInventory = true } = {}) {
    const plot = this.getPlot(x, z);
    if (plot.kind !== 'planted') {
      return { ok: false, reason: 'Nenhuma plantação para colher aqui.' };
    }
    const def = CROP_DEFS[plot.crop];
    if (!def || plot.daysGrown < def.daysToMature) {
      return { ok: false, reason: 'A plantação ainda não está madura.' };
    }

    const result = useFarmStore.getState().harvest({ x, z });
    if (!result) {
      return { ok: false, reason: 'Falha inesperada ao colher.' };
    }

    if (addToInventory) {
      useInventoryStore.getState().add(result.crop, result.quantity);
    }

    return { ok: true, itemId: result.crop, quantity: result.quantity };
  }

  // ---------------------------------------------------------------------------
  // Bulk / simulation
  // ---------------------------------------------------------------------------

  /**
   * Advance one game day for all planted tiles.
   * Delegates to `useFarmStore.getState().advanceDay()`.
   * Called automatically by the timeStore on each day rollover;
   * this method is exposed here for test convenience and manual triggers.
   */
  advanceDay() {
    useFarmStore.getState().advanceDay();
  }

  /**
   * Tick all planted tiles, advancing each by one day.
   * Alias for `advanceDay()` — kept for API symmetry with game-loop callers
   * that pass a deltaTime parameter (ignored here since progression is day-based).
   *
   * @param {number} [deltaTime] — ignored; growth is always day-granular
   */
  update() {
    this.advanceDay();
  }

  // ---------------------------------------------------------------------------
  // Inspection helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns an array of all currently planted tiles as
   * `{ x, z, crop: Crop }` objects.  Useful for UI overlays that need
   * to iterate all growing crops without subscribing to the store.
   *
   * @returns {Array<{ x: number, z: number, crop: Crop }>}
   */
  allPlantedCrops() {
    const { tiles, day } = useFarmStore.getState();
    return Object.entries(tiles)
      .filter(([, tile]) => tile.kind === 'planted')
      .map(([tileKey, tile]) => {
        const [xStr, zStr] = tileKey.split(',');
        const x = Number(xStr);
        const z = Number(zStr);
        return {
          x,
          z,
          crop: new Crop({
            cropId: tile.crop,
            daysGrown: tile.daysGrown,
            plantedOnDay: tile.plantedOnDay,
            watered: tile.lastWateredOnDay >= day,
          }),
        };
      });
  }

  /**
   * Returns all mature (harvestable) plots.
   *
   * @returns {Array<{ x: number, z: number, crop: Crop }>}
   */
  harvestableEntries() {
    return this.allPlantedCrops().filter(({ crop }) => crop.isReadyToHarvest());
  }

  /**
   * Returns the current game day from the farm store.
   *
   * @returns {number}
   */
  get currentDay() {
    return useFarmStore.getState().day;
  }

  /**
   * Returns a plain snapshot of all tiles (safe to serialize).
   *
   * @returns {Record<string, object>}
   */
  getSnapshot() {
    return { ...useFarmStore.getState().tiles };
  }

  /**
   * Reset the farm back to an empty state (clears all tiles, resets day to 1).
   * Intended for use in tests or a "new game" flow.
   */
  reset() {
    useFarmStore.getState().reset();
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/** @type {Farm | null} */
let _instance = null;

/**
 * Lazily create and cache the global Farm instance.
 *
 * @returns {Farm}
 */
export function createFarm() {
  if (!_instance) _instance = new Farm();
  return _instance;
}

/**
 * Returns the cached Farm singleton.  Calls `createFarm()` on first access.
 *
 * @returns {Farm}
 */
export function getFarm() {
  return _instance ?? createFarm();
}

// ---------------------------------------------------------------------------
// Functional API (for callers that prefer plain functions over class methods)
// ---------------------------------------------------------------------------

/**
 * Functional API — thin wrappers delegating to the Farm singleton.
 * Import individual functions when you don't want to import the class.
 */
export const farmAPI = {
  /** @see Farm#getPlot */
  getPlot: (x, z) => getFarm().getPlot(x, z),
  /** @see Farm#getCrop */
  getCrop: (x, z) => getFarm().getCrop(x, z),
  /** @see Farm#isTilled */
  isTilled: (x, z) => getFarm().isTilled(x, z),
  /** @see Farm#hasPlant */
  hasPlant: (x, z) => getFarm().hasPlant(x, z),
  /** @see Farm#till */
  till: (x, z) => getFarm().till(x, z),
  /** @see Farm#water */
  water: (x, z) => getFarm().water(x, z),
  /** @see Farm#plantCrop */
  plantCrop: (x, z, cropId, opts) => getFarm().plantCrop(x, z, cropId, opts),
  /** @see Farm#harvestCrop */
  harvestCrop: (x, z, opts) => getFarm().harvestCrop(x, z, opts),
  /** @see Farm#advanceDay */
  advanceDay: () => getFarm().advanceDay(),
  /** @see Farm#update */
  update: (dt) => getFarm().update(dt),
  /** @see Farm#allPlantedCrops */
  allPlantedCrops: () => getFarm().allPlantedCrops(),
  /** @see Farm#harvestableEntries */
  harvestableEntries: () => getFarm().harvestableEntries(),
  /** @see Farm#getSnapshot */
  getSnapshot: () => getFarm().getSnapshot(),
  /** @see Farm#reset */
  reset: () => getFarm().reset(),
};
