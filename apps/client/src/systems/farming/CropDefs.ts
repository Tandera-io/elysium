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
  /** Season in which this crop can be planted and will grow. */
  readonly season: Season;
  /** Emoji used for quick visual identification in the UI. */
  readonly emoji: string;
  /** Accent color used in season-aware UI (ripe stage representative color). */
  readonly accentColor: string;
}

/** All valid seasons, in calendar order. */
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** Human-readable season labels (Portuguese, matching the rest of the UI). */
export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Verao',
  autumn: 'Outono',
  winter: 'Inverno',
};

/** Season accent colors for UI badges. */
export const SEASON_COLOR: Record<Season, string> = {
  spring: '#7ecb67',
  summer: '#f5c842',
  autumn: '#d4732a',
  winter: '#8bb9e0',
};

export const CROPS: Record<CropId, CropDef> = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    season: 'spring',
    emoji: '[wheat]',
    accentColor: '#e8c34a',
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
    season: 'summer',
    emoji: '[tomato]',
    accentColor: '#d34a3a',
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
    name: 'Abobora',
    season: 'autumn',
    emoji: '[pumpkin]',
    accentColor: '#e8862a',
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
    season: 'summer',
    emoji: '[corn]',
    accentColor: '#e6c44a',
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
    season: 'spring',
    emoji: '[strawberry]',
    accentColor: '#d44a4a',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#7caf3e' },
      { index: 2, daysInStage: 1, color: '#d44a4a' },
    ],
    daysToMature: 3,
    yieldQuantity: 4,
  },
};

/**
 * Returns all crop definitions that can be planted in the given season.
 */
export function getAvailableCrops(season: Season): CropDef[] {
  return (Object.values(CROPS) as CropDef[]).filter((c) => c.season === season);
}

/**
 * Returns true when a planted crop is out of its natural season.
 * Out-of-season crops should wilt at end-of-day.
 */
export function isOutOfSeason(cropId: CropId, currentSeason: Season): boolean {
  return CROPS[cropId].season !== currentSeason;
}

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
