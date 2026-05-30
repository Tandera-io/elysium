/**
 * Crops.jsx — Crop metadata and sprite path registry for the farming system.
 *
 * This module provides:
 *   - CROP_DEFS: full metadata per crop (name, stages, growth times, yield)
 *   - CROP_IMAGE_PATHS: direct paths to the local PNG assets in
 *     src/assets/images/crops/ for use outside of the sprite cache pipeline
 *   - CropIcon: a lightweight React component that renders a crop's image asset
 *
 * The canonical runtime sprite paths (pointing at hashed cache files) remain in
 * src/content/assets.ts (CROP_SPRITES).  This file supplements that registry
 * with source-asset paths and rich crop metadata used by UI components, tooltip
 * systems, and the inventory screen.
 */

// ─── Crop image paths ────────────────────────────────────────────────────────
// Vite ?url imports resolve to the public URL of the asset at build time.
import tomatoPng from '../../assets/images/crops/tomato.png?url';
import cornPng from '../../assets/images/crops/corn.png?url';
import pumpkinPng from '../../assets/images/crops/pumpkin.png?url';
import strawberryPng from '../../assets/images/crops/strawberry.png?url';
import wheatPng from '../../assets/images/crops/wheat.png?url';
import lettucePng from '../../assets/images/crops/lettuce.png?url';
import sunflowerPng from '../../assets/images/crops/sunflower.png?url';

/**
 * Maps each CropId to the Vite-resolved URL of its source crop image.
 * Use this in img tags or anywhere you need a 2D preview of the crop.
 *
 * @type {Record<import('../../systems/farming/CropDefs').CropId, string>}
 */
export const CROP_IMAGE_PATHS = {
  tomato: tomatoPng,
  corn: cornPng,
  pumpkin: pumpkinPng,
  strawberry: strawberryPng,
  wheat: wheatPng,
  lettuce: lettucePng,
  sunflower: sunflowerPng,
};

// ─── Crop definitions ─────────────────────────────────────────────────────────
// Mirrors CropDefs.ts with additional UI-facing fields (season, description).
// Truth for game-logic fields (stages, daysToMature, yieldQuantity) lives in
// CropDefs.ts; this file adds presentation metadata.

/**
 * @typedef {'spring' | 'summer' | 'fall' | 'winter'} Season
 *
 * @typedef {Object} CropMeta
 * @property {string}   id            - Matches CropId in CropDefs.ts
 * @property {string}   name          - Display name (may be localized later)
 * @property {string}   description   - Short flavour text for tooltip / shop
 * @property {Season[]} seasons       - Seasons in which this crop can grow
 * @property {number}   growthDays    - Total days from seed to harvestable
 * @property {number}   yieldMin      - Minimum harvest quantity
 * @property {number}   yieldMax      - Maximum harvest quantity
 * @property {number}   sellPrice     - Base sell price per unit (gold)
 * @property {string}   accentColor   - Hex color for UI accent / placeholder
 * @property {string}   imagePath     - Resolved PNG URL (from CROP_IMAGE_PATHS)
 */

/**
 * Full crop metadata keyed by CropId.
 * @type {Record<string, CropMeta>}
 */
export const CROP_DEFS = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    description: 'Um cereal versátil. Cresce rápido e rende bem em solo arado.',
    seasons: ['spring', 'summer'],
    growthDays: 4,
    yieldMin: 2,
    yieldMax: 3,
    sellPrice: 25,
    accentColor: '#e8c34a',
    imagePath: CROP_IMAGE_PATHS.wheat,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    description: 'Vermelho e suculento. Prefere dias longos de verão.',
    seasons: ['summer'],
    growthDays: 5,
    yieldMin: 3,
    yieldMax: 5,
    sellPrice: 40,
    accentColor: '#d34a3a',
    imagePath: CROP_IMAGE_PATHS.tomato,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Abóbora',
    description: 'Grande e resistente. Amadurece lentamente no outono.',
    seasons: ['fall'],
    growthDays: 7,
    yieldMin: 1,
    yieldMax: 2,
    sellPrice: 80,
    accentColor: '#e8862a',
    imagePath: CROP_IMAGE_PATHS.pumpkin,
  },
  corn: {
    id: 'corn',
    name: 'Milho',
    description: 'Espiga dourada que cresce alto. Boa fonte de renda no verão.',
    seasons: ['summer', 'fall'],
    growthDays: 6,
    yieldMin: 3,
    yieldMax: 4,
    sellPrice: 50,
    accentColor: '#e6c44a',
    imagePath: CROP_IMAGE_PATHS.corn,
  },
  strawberry: {
    id: 'strawberry',
    name: 'Morango',
    description: 'Delicioso e raro. Madura depressa na primavera.',
    seasons: ['spring'],
    growthDays: 3,
    yieldMin: 4,
    yieldMax: 6,
    sellPrice: 60,
    accentColor: '#d44a4a',
    imagePath: CROP_IMAGE_PATHS.strawberry,
  },
  lettuce: {
    id: 'lettuce',
    name: 'Alface',
    description: 'Folhas frescas e crocantes. Cresce rapidamente na primavera.',
    seasons: ['spring', 'fall'],
    growthDays: 3,
    yieldMin: 3,
    yieldMax: 5,
    sellPrice: 30,
    accentColor: '#56a03c',
    imagePath: CROP_IMAGE_PATHS.lettuce,
  },
  sunflower: {
    id: 'sunflower',
    name: 'Girassol',
    description: 'Vira-se para o sol. Produz sementes valiosas no verão.',
    seasons: ['summer'],
    growthDays: 6,
    yieldMin: 2,
    yieldMax: 3,
    sellPrice: 70,
    accentColor: '#ffc800',
    imagePath: CROP_IMAGE_PATHS.sunflower,
  },
};

/**
 * Ordered list of all crop IDs.
 * @type {string[]}
 */
export const ALL_CROP_IDS = Object.keys(CROP_DEFS);

// ─── CropIcon component ───────────────────────────────────────────────────────
/**
 * Renders a small crop image suitable for inventory slots and tooltips.
 *
 * Props:
 *   cropId  {string}  — one of the CropId values
 *   size    {number}  — pixel size (width = height), default 32
 *   alt     {string}  — alt text override (defaults to crop name)
 *   style   {object}  — additional inline styles
 *
 * @param {{ cropId: string, size?: number, alt?: string, style?: object }} props
 */
export function CropIcon({ cropId, size = 32, alt, style }) {
  const def = CROP_DEFS[cropId];
  if (!def) return null;

  return (
    <img
      src={def.imagePath}
      alt={alt ?? def.name}
      width={size}
      height={size}
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        ...style,
      }}
    />
  );
}

export default CROP_DEFS;
