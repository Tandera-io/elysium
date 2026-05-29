/**
 * Crop definitions. Each crop has growth stages with day counts.
 * `daysToMature` is the sum of all stage durations.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type CropId = 'wheat' | 'tomato' | 'pumpkin' | 'corn' | 'strawberry' | 'lettuce';

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
  readonly seasonGrowthRates: Partial<Record<Season, number>>;
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
    seasonGrowthRates: { spring: 1.2, summer: 1.2, autumn: 0.9, winter: 0.75 },
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
    seasonGrowthRates: { spring: 0.85, summer: 1.35, autumn: 0.8, winter: 0.6 },
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
    seasonGrowthRates: { spring: 0.7, summer: 0.85, autumn: 0.5, winter: 0.4 },
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
    seasonGrowthRates: { spring: 0.9, summer: 1.25, autumn: 1.0, winter: 0.7 },
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
    seasonGrowthRates: { spring: 1.5, summer: 0.9, autumn: 0.7, winter: 0.5 },
  },
  lettuce: {
    id: 'lettuce',
    name: 'Alface',
    stages: [
      { index: 0, daysInStage: 1, color: '#5a4a2a' },
      { index: 1, daysInStage: 1, color: '#7cbb5e' },
      { index: 2, daysInStage: 1, color: '#5a9e40' },
      { index: 3, daysInStage: 1, color: '#4a8e30' }, // full head
    ],
    daysToMature: 4,
    yieldQuantity: 3,
    seasonGrowthRates: { spring: 2.0, summer: 1.2, autumn: 0.8, winter: 0.5 },
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

export function effectiveDaysToMature(crop: CropDef, season: Season): number {
  const rate = crop.seasonGrowthRates[season] ?? 1.0;
  return Math.max(1, Math.round(crop.daysToMature / rate));
}

export function isMatureInSeason(crop: CropDef, daysSincePlanted: number, season: Season): boolean {
  return daysSincePlanted >= effectiveDaysToMature(crop, season);
}

/** Daily daysGrown increment for a crop in a given season (higher = grows faster). */
export function getDailyGrowthIncrement(crop: CropDef, season: Season): number {
  return crop.seasonGrowthRates[season] ?? 1.0;
}
