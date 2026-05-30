// apps/client/src/farming/Crop.js
//
// Crop — plain-JS value object wrapping a planted crop tile.
//
// This module is the JS-layer counterpart to the TypeScript CropDefs.ts /
// farmStore.ts internals. It provides an imperative API usable by non-React
// code (NPC scripts, quest triggers, dialogue pipelines) without touching
// Zustand hooks directly.
//
// Lifecycle stages mirror farmStore.ts TileState "planted" shape:
//   stage 0  seed       (just placed, not yet sprouting)
//   stage N  growing    (intermediate stages defined per crop)
//   last     harvestable (daysGrown >= def.daysToMature)
//
// Exported surface:
//   CROP_DEFS        — plain-JS copy of crop definitions keyed by cropId
//   Crop             — class representing one planted tile
//   createCrop(cropId, opts?) — factory: constructs a Crop from CROP_DEFS
//   cropName(cropId)          — localised display name (Portuguese)
//   cropIds()                 — array of all valid crop id strings

// ---------------------------------------------------------------------------
// Crop definitions (JS copy — source of truth is CropDefs.ts)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ index: number, daysInStage: number, color: string }} CropStageDef
 * @typedef {{ id: string, name: string, stages: CropStageDef[], daysToMature: number, yieldQuantity: number, seasons: string[] }} CropDefinition
 */

/** @type {Record<string, CropDefinition>} */
export const CROP_DEFS = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#8db454' },
      { index: 2, daysInStage: 1, color: '#c2c44a' },
      { index: 3, daysInStage: 1, color: '#e8c34a' },
    ],
    daysToMature: 4,
    yieldQuantity: 2,
    seasons: ['spring', 'summer'],
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#7caf3e' },
      { index: 2, daysInStage: 1, color: '#5e9b2e' },
      { index: 3, daysInStage: 1, color: '#3d7f1e' },
      { index: 4, daysInStage: 1, color: '#d34a3a' },
    ],
    daysToMature: 5,
    yieldQuantity: 3,
    seasons: ['summer'],
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Abóbora',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 2, color: '#7caf3e' },
      { index: 2, daysInStage: 2, color: '#5e9b2e' },
      { index: 3, daysInStage: 2, color: '#e8862a' },
    ],
    daysToMature: 7,
    yieldQuantity: 1,
    seasons: ['autumn'],
  },
  corn: {
    id: 'corn',
    name: 'Milho',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#9bbf52' },
      { index: 2, daysInStage: 2, color: '#c2c44a' },
      { index: 3, daysInStage: 2, color: '#e6c44a' },
    ],
    daysToMature: 6,
    yieldQuantity: 3,
    seasons: ['summer', 'autumn'],
  },
  strawberry: {
    id: 'strawberry',
    name: 'Morango',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#7caf3e' },
      { index: 2, daysInStage: 1, color: '#d44a4a' },
    ],
    daysToMature: 3,
    yieldQuantity: 4,
    seasons: ['spring'],
  },
};

// ---------------------------------------------------------------------------
// Crop class
// ---------------------------------------------------------------------------

export class Crop {
  /**
   * @param {Object} opts
   * @param {string}  opts.cropId         — key into CROP_DEFS
   * @param {number}  [opts.daysGrown]    — days elapsed since planting (default 0)
   * @param {number}  [opts.plantedOnDay] — game-day number when planted (default 1)
   * @param {boolean} [opts.watered]      — whether the tile was watered today
   */
  constructor({ cropId, daysGrown = 0, plantedOnDay = 1, watered = false }) {
    const def = CROP_DEFS[cropId];
    if (!def) throw new Error(`Unknown crop id: "${cropId}"`);

    /** @type {CropDefinition} */
    this.def = def;
    this.cropId = cropId;
    this.daysGrown = daysGrown;
    this.plantedOnDay = plantedOnDay;
    this.watered = watered;
    this._harvested = false;
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /** Current growth stage definition based on daysGrown. */
  get currentStage() {
    let cumulative = 0;
    for (const stage of this.def.stages) {
      cumulative += stage.daysInStage;
      if (this.daysGrown < cumulative) return stage;
    }
    return this.def.stages[this.def.stages.length - 1];
  }

  /** 0-based stage index (convenience shorthand). */
  get stageIndex() {
    return this.currentStage.index;
  }

  /** Accent color string for the current growth stage. */
  get stageColor() {
    return this.currentStage.color;
  }

  /** Name of the crop in the game locale (Portuguese). */
  get name() {
    return this.def.name;
  }

  // ---------------------------------------------------------------------------
  // Growth
  // ---------------------------------------------------------------------------

  /**
   * Advance growth by one game day.
   *
   * In the current MVP all watering logic is handled by the Zustand store;
   * this method simply increments `daysGrown` by one regardless.  Future
   * phases can pass `requiresWater=true` and check `this.watered` before
   * growing.
   *
   * @param {{ requiresWater?: boolean }} [opts]
   * @returns {boolean} true when the crop advanced a stage
   */
  grow({ requiresWater = false } = {}) {
    if (this._harvested) return false;
    if (requiresWater && !this.watered) return false;
    const prevStage = this.stageIndex;
    this.daysGrown += 1;
    this.watered = false; // reset daily water flag
    return this.stageIndex !== prevStage;
  }

  /**
   * True when the crop has reached full maturity and can be harvested.
   *
   * @returns {boolean}
   */
  isReadyToHarvest() {
    return !this._harvested && this.daysGrown >= this.def.daysToMature;
  }

  /**
   * Harvest the crop, returning the produce item id and quantity.
   * After harvesting, `isReadyToHarvest()` returns false and further
   * `grow()` calls are no-ops.
   *
   * @returns {{ itemId: string, quantity: number } | null}
   *   null when not yet mature or already harvested.
   */
  harvest() {
    if (!this.isReadyToHarvest()) return null;
    this._harvested = true;
    return { itemId: this.cropId, quantity: this.def.yieldQuantity };
  }

  // ---------------------------------------------------------------------------
  // Serialisation helpers
  // ---------------------------------------------------------------------------

  /**
   * Serialise to a plain object compatible with the Zustand store's planted
   * tile shape so state can round-trip between the imperative and reactive layers.
   *
   * @returns {{ cropId: string, daysGrown: number, plantedOnDay: number, watered: boolean }}
   */
  toJSON() {
    return {
      cropId: this.cropId,
      daysGrown: this.daysGrown,
      plantedOnDay: this.plantedOnDay,
      watered: this.watered,
    };
  }

  /**
   * Reconstruct a Crop from a plain object (e.g. loaded from store snapshot).
   *
   * @param {{ cropId: string, daysGrown?: number, plantedOnDay?: number, watered?: boolean }} data
   * @returns {Crop}
   */
  static fromJSON(data) {
    return new Crop(data);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Construct a Crop from a crop id string.
 *
 * @param {string} cropId
 * @param {{ daysGrown?: number, plantedOnDay?: number, watered?: boolean }} [opts]
 * @returns {Crop}
 */
export function createCrop(cropId, opts = {}) {
  return new Crop({ cropId, ...opts });
}

/**
 * Returns the localised display name for a crop id.
 *
 * @param {string} cropId
 * @returns {string}
 */
export function cropName(cropId) {
  return CROP_DEFS[cropId]?.name ?? cropId;
}

/**
 * Returns an array of all registered crop id strings.
 *
 * @returns {string[]}
 */
export function cropIds() {
  return Object.keys(CROP_DEFS);
}

/**
 * True when `cropId` is not in season for the given season string.
 *
 * @param {string} cropId
 * @param {string} season  — 'spring' | 'summer' | 'autumn' | 'winter'
 * @returns {boolean}
 */
export function isCropOutOfSeason(cropId, season) {
  const def = CROP_DEFS[cropId];
  if (!def) return true;
  return !def.seasons.includes(season);
}

/**
 * Returns all crop definitions that can grow during `season`.
 *
 * @param {string} season
 * @returns {CropDefinition[]}
 */
export function cropsForSeason(season) {
  return Object.values(CROP_DEFS).filter((def) => def.seasons.includes(season));
}
