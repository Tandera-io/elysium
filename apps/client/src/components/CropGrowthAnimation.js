/**
 * CropGrowthAnimation — stage shape configuration for animated crop visuals.
 *
 * Each entry corresponds to a growth stage index (0 = freshly seeded,
 * higher = older). The React Three Fiber component in
 * ./Crops/CropGrowthAnimation.tsx reads these values to size/animate the
 * placeholder geometry while sprite assets are not yet available for that stage.
 *
 * Units are world-space (metres). The cone sits on the soil plane (y=0) so
 * yOffset is half the height.
 */

/** @type {readonly { coneRadius: number; coneHeight: number; segments: number; swayAmplitude: number; swayFreq: number }[]} */
export const STAGE_SHAPE_CONFIGS = [
  // Stage 0 — freshly seeded: barely visible soil bump
  { coneRadius: 0.05, coneHeight: 0.08, segments: 4, swayAmplitude: 0.01, swayFreq: 0.8 },
  // Stage 1 — seedling: small pointy shoot
  { coneRadius: 0.09, coneHeight: 0.22, segments: 5, swayAmplitude: 0.03, swayFreq: 1.0 },
  // Stage 2 — growing: medium-height stalk
  { coneRadius: 0.13, coneHeight: 0.4, segments: 6, swayAmplitude: 0.05, swayFreq: 1.1 },
  // Stage 3 — near-mature: tall stalk ready to finish
  { coneRadius: 0.16, coneHeight: 0.58, segments: 7, swayAmplitude: 0.06, swayFreq: 1.2 },
];

/**
 * Returns the shape config clamped to the valid range.
 * @param {number} stageIndex
 * @returns {typeof STAGE_SHAPE_CONFIGS[number]}
 */
export function shapeForStage(stageIndex) {
  const idx = Math.max(0, Math.min(stageIndex, STAGE_SHAPE_CONFIGS.length - 1));
  return STAGE_SHAPE_CONFIGS[idx];
}
