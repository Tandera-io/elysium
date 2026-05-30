import type { GridConfig } from '../engine/world/WorldGrid';
import { DEFAULT_GRID } from '../engine/world/WorldGrid';

export interface FarmLayout {
  readonly id: string;
  readonly grid: GridConfig;
}

export const FARM_LAYOUTS: Record<string, FarmLayout> = {
  marisa: {
    id: 'marisa',
    grid: DEFAULT_GRID,
  },
};
