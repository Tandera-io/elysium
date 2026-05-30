// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/stores/farmingStore.js
//
// Farming season store — thin JS layer that re-exports the canonical
// TypeScript farming store and surfaces season-specific helpers that
// DOM/React overlay components can import from a single path.
//
// Exposes:
//   SEASONS          — ordered array of season keys
//   SEASON_LABEL     — human-readable labels (Portuguese)
//   SEASON_COLOR     — accent hex colors per season
//   getAvailableCrops(season) — returns CropDef[] for the given season
//   isOutOfSeason(cropId, season) — true when crop does not grow in season
//   useFarmStore     — re-exported Zustand store from farmStore.ts
//   useCurrentSeason — convenience hook: returns the active Season string

import { useFarmStore } from '../systems/farming/farmStore';
import {
  SEASONS,
  SEASON_LABEL,
  SEASON_COLOR,
  getAvailableCrops,
  isOutOfSeason,
} from '../systems/farming/CropDefs';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';

export { SEASONS, SEASON_LABEL, SEASON_COLOR, getAvailableCrops, isOutOfSeason, useFarmStore };

/**
 * React hook — returns the current Season string from the time store.
 * Triggers re-renders whenever the season changes.
 */
export function useCurrentSeason() {
  return useTimeStore((s) => currentSeason(s));
}
