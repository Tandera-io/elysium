// apps/client/src/stores/farmStore.js
//
// Thin JS re-export layer for the canonical TypeScript farm store.
// Provides React hooks and farm utilities that JS/JSX components can
// import from a single stable path without depending on TypeScript internals.
//
// Exposes:
//   useFarmStore  — Zustand store: tiles, day, till/water/plant/harvest/advanceDay
//   CROPS         — CropId → CropDef map (name, daysToMature, yieldQuantity)
//   stageForDayCount(cropDef, days) — returns the current CropStage
//   isMature(cropDef, days)         — true when crop is ready to harvest

export { useFarmStore } from '../systems/farming/farmStore';
export { CROPS, stageForDayCount, isMature } from '../systems/farming/CropDefs';
