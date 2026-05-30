/**
 * Crop growth feature — visual geometry parameters derived from growth stage.
 *
 * Used by FarmField to render a cone that visually grows taller/wider as
 * daysGrown advances through each stage, giving players clear feedback that
 * their plant is progressing toward harvest.
 */

export interface CropGrowthGeometry {
  /** Cone base radius in world units. */
  radius: number;
  /** Cone height in world units. */
  height: number;
  /** Number of radial segments (higher = rounder). */
  segments: number;
  /** Y offset so the base sits on the soil plane. */
  yOffset: number;
}

/**
 * Compute Three.js cone geometry parameters for a given growth stage.
 *
 * @param stageIndex  0-based index of the current stage (0 = just seeded)
 * @param totalStages Total number of stages defined for this crop
 */
export function cropGrowthGeometry(stageIndex: number, totalStages: number): CropGrowthGeometry {
  // Progress from 0 (seed) to 1 (one step before mature sprite takes over).
  const t = totalStages > 1 ? (stageIndex + 1) / totalStages : 1;

  const radius = 0.04 + 0.13 * t;
  const height = 0.08 + 0.52 * t;
  return {
    radius,
    height,
    segments: stageIndex >= totalStages - 2 ? 8 : 6,
    yOffset: height / 2,
  };
}

/**
 * Path prefix for per-stage plant sprites stored under assets/images/plants/.
 * File convention: `<cropId>_stage<n>.png`
 */
export const PLANT_SPRITES_DIR = 'assets/images/plants' as const;

/**
 * Build the public asset path for a per-stage plant sprite.
 *
 * @param cropId   e.g. 'wheat'
 * @param stageIdx 0-based stage index
 */
export function plantStagePath(cropId: string, stageIdx: number): string {
  return `${PLANT_SPRITES_DIR}/${cropId}_stage${stageIdx}.png`;
}
