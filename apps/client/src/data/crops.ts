// Stable data-layer facade for crop definitions.
// Import from here in UI components; the canonical source is CropDefs.ts.
export {
  CROPS,
  CROPS as cropDefs,
  stageForDayCount,
  isMature,
  type CropDef,
  type CropId,
  type CropStage,
} from '../systems/farming/CropDefs';
