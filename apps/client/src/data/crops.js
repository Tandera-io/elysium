/**
 * crops.js — Plain-JS crop catalogue consumed by Farm.jsx and the farming sagas.
 *
 * Each entry mirrors the TypeScript CropDef shape defined in
 * systems/farming/CropDefs.ts so the two can evolve in sync.
 *
 * Growth stage colours are Stardew-inspired earth/plant tones used by the
 * HUD overlay and the CSS crop-tile indicators.
 */

/** @typedef {'wheat'|'tomato'|'pumpkin'|'corn'|'strawberry'} CropId */

/**
 * @typedef {Object} CropStage
 * @property {number} index        - Stage index (0 = seed, last = harvestable).
 * @property {number} daysInStage  - Days needed before advancing.
 * @property {string} color        - CSS colour hint for the growth indicator.
 * @property {string} label        - Human-readable stage name.
 */

/**
 * @typedef {Object} CropDef
 * @property {CropId} id
 * @property {string} name          - Display name (pt-BR).
 * @property {string} emoji         - Emoji icon for HUD buttons.
 * @property {string} seedItem      - Inventory item id for the seed.
 * @property {CropStage[]} stages
 * @property {number} daysToMature
 * @property {number} yieldQuantity - Base harvest quantity.
 */

/** @type {Record<CropId, CropDef>} */
export const CROPS = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    emoji: '🌾',
    seedItem: 'seed_wheat',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a', label: 'Semente' },
      { index: 1, daysInStage: 1, color: '#8db454', label: 'Broto' },
      { index: 2, daysInStage: 1, color: '#c2c44a', label: 'Crescendo' },
      { index: 3, daysInStage: 1, color: '#e8c34a', label: 'Maduro' },
    ],
    daysToMature: 4,
    yieldQuantity: 2,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    emoji: '🍅',
    seedItem: 'seed_tomato',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a', label: 'Semente' },
      { index: 1, daysInStage: 1, color: '#7caf3e', label: 'Broto' },
      { index: 2, daysInStage: 1, color: '#5e9b2e', label: 'Crescendo' },
      { index: 3, daysInStage: 1, color: '#3d7f1e', label: 'Verde' },
      { index: 4, daysInStage: 1, color: '#d34a3a', label: 'Maduro' },
    ],
    daysToMature: 5,
    yieldQuantity: 3,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Abóbora',
    emoji: '🎃',
    seedItem: 'seed_pumpkin',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a', label: 'Semente' },
      { index: 1, daysInStage: 2, color: '#7caf3e', label: 'Broto' },
      { index: 2, daysInStage: 2, color: '#5e9b2e', label: 'Crescendo' },
      { index: 3, daysInStage: 2, color: '#e8862a', label: 'Maduro' },
    ],
    daysToMature: 7,
    yieldQuantity: 1,
  },
  corn: {
    id: 'corn',
    name: 'Milho',
    emoji: '🌽',
    seedItem: 'seed_corn',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a', label: 'Semente' },
      { index: 1, daysInStage: 1, color: '#9bbf52', label: 'Broto' },
      { index: 2, daysInStage: 2, color: '#c2c44a', label: 'Crescendo' },
      { index: 3, daysInStage: 2, color: '#e6c44a', label: 'Maduro' },
    ],
    daysToMature: 6,
    yieldQuantity: 3,
  },
  strawberry: {
    id: 'strawberry',
    name: 'Morango',
    emoji: '🍓',
    seedItem: 'seed_strawberry',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a', label: 'Semente' },
      { index: 1, daysInStage: 1, color: '#7caf3e', label: 'Broto' },
      { index: 2, daysInStage: 1, color: '#d44a4a', label: 'Maduro' },
    ],
    daysToMature: 3,
    yieldQuantity: 4,
  },
};

/**
 * Returns the CropStage for `daysSincePlanted` in a given crop.
 * Clamps to the last stage once the crop is fully grown.
 *
 * @param {CropDef} crop
 * @param {number} daysSincePlanted
 * @returns {CropStage}
 */
export function stageForDayCount(crop, daysSincePlanted) {
  let cumulative = 0;
  for (const stage of crop.stages) {
    cumulative += stage.daysInStage;
    if (daysSincePlanted < cumulative) return stage;
  }
  return crop.stages[crop.stages.length - 1];
}

/**
 * Returns true when `daysSincePlanted` meets or exceeds the crop's
 * `daysToMature` threshold.
 *
 * @param {CropDef} crop
 * @param {number} daysSincePlanted
 * @returns {boolean}
 */
export function isMature(crop, daysSincePlanted) {
  return daysSincePlanted >= crop.daysToMature;
}

/** Ordered array of all crop ids for iteration. */
export const CROP_IDS = /** @type {CropId[]} */ (Object.keys(CROPS));
