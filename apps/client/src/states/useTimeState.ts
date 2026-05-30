// Convenience hooks for season-aware UI components.
export {
  type Season,
  SEASONS,
  SEASON_LABEL,
  DAYS_PER_SEASON,
  currentSeason,
  formatClock,
  useTimeStore,
} from '../systems/time/timeStore';

import { useTimeStore, SEASONS } from '../systems/time/timeStore';
import type { Season } from '../systems/time/timeStore';
import { CROPS } from '../systems/farming/CropDefs';
import type { CropId } from '../systems/farming/CropDefs';

export function useCurrentSeason(): Season {
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  return SEASONS[seasonIndex] ?? 'spring';
}

export function useInSeasonCrops(): CropId[] {
  const season = useCurrentSeason();
  return (Object.values(CROPS) as Array<(typeof CROPS)[CropId]>)
    .filter((def) => (def.seasons as readonly Season[]).includes(season))
    .map((def) => def.id);
}
