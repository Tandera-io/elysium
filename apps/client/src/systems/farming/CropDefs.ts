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
  readonly seasons: readonly Season[];
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
    seasons: ['spring', 'autumn'],
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
    seasons: ['summer'],
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
    seasons: ['summer'],
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
