// apps/client/src/stores/farmingStore.js
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
//
// Imperative JS API (wraps farmStore + inventoryStore):
//   Farm             — class managing a grid of crop plots
//   Crop             — class representing one planted tile
//   createFarm()     — singleton Farm factory
//   getFarm()        — returns the cached Farm singleton
//   farmAPI          — functional API surface mirroring Farm methods
//   CROP_DEFS        — plain-JS crop definitions keyed by cropId
//   createCrop()     — factory for Crop instances
//   cropName()       — localised crop display name
//   cropIds()        — array of all valid crop id strings

import { useFarmStore } from '../systems/farming/farmStore';
import {
  SEASONS,
  SEASON_LABEL,
  SEASON_COLOR,
  getAvailableCrops,
  isOutOfSeason,
} from '../systems/farming/CropDefs';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { Farm, createFarm, getFarm, farmAPI } from '../farming/Farm.js';
import { Crop, CROP_DEFS, createCrop, cropName, cropIds } from '../farming/Crop.js';

export {
  // Season metadata
  SEASONS,
  SEASON_LABEL,
  SEASON_COLOR,
  getAvailableCrops,
  isOutOfSeason,
  // Zustand store
  useFarmStore,
  // Imperative crop-growth API
  Farm,
  Crop,
  CROP_DEFS,
  createFarm,
  getFarm,
  farmAPI,
  createCrop,
  cropName,
  cropIds,
};

/**
 * React hook — returns the current Season string from the time store.
 * Triggers re-renders whenever the season changes.
 */
export function useCurrentSeason() {
  return useTimeStore((s) => currentSeason(s));
}
