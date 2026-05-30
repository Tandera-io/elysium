/**
 * Crop definitions. Each crop has growth stages with day counts.
 * `daysToMature` is the sum of all stage durations.
 */

import type { Season } from '../time/timeStore';

export type CropId = 'wheat' | 'tomato' | 'pumpkin' | 'corn' | 'strawberry';

export interface CropStage {
  /** 0 = just planted, last index = mature/ready to harvest. */
  readonly index: number;
  /** Days needed in this stage before advancing. */
  readonly daysInStage: number;
  /** Color hint for the visual placeholder. */
  readonly color: string;
}

export interface CropDef {
  readonly id: CropId;
  readonly name: string;
  readonly stages: readonly CropStage[];
  readonly daysToMature: number;
  readonly yieldQuantity: number;
}

export const CROPS: Record<CropId, CropDef> = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' }, // seeded soil
      { index: 1, daysInStage: 1, color: '#8db454' }, // sprout
      { index: 2, daysInStage: 1, color: '#c2c44a' }, // young
      { index: 3, daysInStage: 1, color: '#e8c34a' }, // mature
    ],
    daysToMature: 4,
    yieldQuantity: 2,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#7caf3e' },
      { index: 2, daysInStage: 1, color: '#5e9b2e' },
      { index: 3, daysInStage: 1, color: '#3d7f1e' },
      { index: 4, daysInStage: 1, color: '#d34a3a' }, // ripe red
    ],
    daysToMature: 5,
    yieldQuantity: 3,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Abóbora',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 2, color: '#7caf3e' },
      { index: 2, daysInStage: 2, color: '#5e9b2e' },
      { index: 3, daysInStage: 2, color: '#e8862a' }, // ripe orange
    ],
    daysToMature: 7,
    yieldQuantity: 1,
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
  },
};

export function stageForDayCount(crop: CropDef, daysSincePlanted: number): CropStage {
  let cumulative = 0;
  for (const stage of crop.stages) {
    cumulative += stage.daysInStage;
    if (daysSincePlanted < cumulative) return stage;
  }
  const last = crop.stages[crop.stages.length - 1];
  if (!last) throw new Error(`CropDef ${crop.id} has no stages`);
  return last;
}

export function isMature(crop: CropDef, daysSincePlanted: number): boolean {
  return daysSincePlanted >= crop.daysToMature;
}

// ---------------------------------------------------------------------------
// Season metadata
// ---------------------------------------------------------------------------

/** Ordered season keys (re-exported from timeStore for convenience). */
export { SEASONS } from '../time/timeStore';

/** Human-readable labels in Portuguese. */
export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Verão',
  autumn: 'Outono',
  winter: 'Inverno',
};

/** Accent hex color per season (used by UI overlays). */
export const SEASON_COLOR: Record<Season, string> = {
  spring: '#7ecb6a',
  summer: '#f5c518',
  autumn: '#d4732a',
  winter: '#8bb8d4',
};

/**
 * Which seasons each crop can grow in.
 * Key = CropId; value = tuple of Season strings.
 */
const CROP_SEASONS: Record<CropId, readonly Season[]> = {
  wheat: ['spring', 'summer'],
  tomato: ['summer'],
  pumpkin: ['autumn'],
  corn: ['summer', 'autumn'],
  strawberry: ['spring'],
};

/**
 * Returns all crop definitions that can grow during `season`.
 *
 * @param season — the active Season string
 */
export function getAvailableCrops(season: Season): CropDef[] {
  return (Object.values(CROPS) as CropDef[]).filter((def) =>
    CROP_SEASONS[def.id]?.includes(season),
  );
}

/**
 * True when `cropId` cannot grow during `season`.
 *
 * @param cropId  — id of the crop to check
 * @param season  — the active Season string
 */
export function isOutOfSeason(cropId: CropId, season: Season): boolean {
  return !(CROP_SEASONS[cropId]?.includes(season) ?? false);
}
