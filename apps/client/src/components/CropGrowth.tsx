/**
 * CropGrowth — typed TypeScript wrapper around CropDisplay and CropGrowthBar.
 *
 * Bridges the 2D crop growth animation components with the typed farming
 * system (CropDefs + farmStore). Accepts a `cropId` and `daysGrown` directly
 * from the farm store tile state and reads crop metadata from CROPS to drive
 * the display — callers do not need to thread daysToMature or totalStages.
 *
 * Exports:
 *   CropGrowth        — sprite + optional label + optional progress bar
 *   useCropGrowthInfo — hook returning computed display data for a planted tile
 */

import { CROPS } from '../systems/farming/CropDefs';
import type { CropId } from '../systems/farming/CropDefs';
import { CropDisplay, CropGrowthBar } from './CropDisplay.jsx';

export interface CropGrowthProps {
  /** The crop variety to render. */
  cropId: CropId;
  /** Days since the crop was planted (from TileState.daysGrown). */
  daysGrown: number;
  /** Pixel size of the rendered sprite square (default 64). */
  size?: number;
  /** Show the stage label (e.g. "Broto", "Maduro") below the sprite. */
  showLabel?: boolean;
  /** Show the growth progress bar below the sprite. */
  showBar?: boolean;
  /** Enable CSS breathing / pulse animations. */
  animate?: boolean;
}

/**
 * Renders a crop at its current growth stage with optional label and progress
 * bar. All crop metadata (stage count, days to mature) is read from CropDefs
 * so callers only need to pass `cropId` and `daysGrown`.
 */
export function CropGrowth({
  cropId,
  daysGrown,
  size = 64,
  showLabel = false,
  showBar = false,
  animate = true,
}: CropGrowthProps) {
  const def = CROPS[cropId];

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <CropDisplay
        cropId={cropId}
        daysGrown={daysGrown}
        daysToMature={def.daysToMature}
        totalStages={def.stages.length}
        size={size}
        showLabel={showLabel}
        animate={animate}
      />
      {showBar && (
        <CropGrowthBar daysGrown={daysGrown} daysToMature={def.daysToMature} width={size} />
      )}
    </div>
  );
}

/** Computed display data for a planted tile — useful for tooltips or HUD. */
export interface CropGrowthInfo {
  cropId: CropId;
  cropName: string;
  daysGrown: number;
  daysToMature: number;
  totalStages: number;
  currentStageIndex: number;
  isHarvestReady: boolean;
  progressPct: number;
}

/**
 * Returns computed growth display info for a planted tile. Can be used by HUD
 * components and tooltips that need more than just the sprite.
 */
export function useCropGrowthInfo(cropId: CropId, daysGrown: number): CropGrowthInfo {
  const def = CROPS[cropId];
  const totalStages = def.stages.length;

  let currentStageIndex: number;
  if (totalStages <= 1 || daysGrown <= 0) {
    currentStageIndex = 0;
  } else if (daysGrown >= def.daysToMature) {
    currentStageIndex = totalStages - 1;
  } else {
    currentStageIndex = Math.min(
      Math.floor((daysGrown / def.daysToMature) * totalStages),
      totalStages - 1,
    );
  }

  return {
    cropId,
    cropName: def.name,
    daysGrown,
    daysToMature: def.daysToMature,
    totalStages,
    currentStageIndex,
    isHarvestReady: daysGrown >= def.daysToMature,
    progressPct: Math.min(daysGrown / Math.max(def.daysToMature, 1), 1) * 100,
  };
}

export default CropGrowth;
