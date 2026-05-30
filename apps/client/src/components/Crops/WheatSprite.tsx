import { Suspense } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { CROP_SPRITES, WHEAT_STAGE_SPRITES } from '../../content/assets';

interface WheatSpriteProps {
  /**
   * Number of days this wheat tile has been growing (daysGrown from farmStore).
   * Wheat stages: 0 = seed, 1 = sprout, 2 = growing, 3+ = mature (harvestable).
   */
  daysGrown: number;
}

/**
 * Renders a Stardew Valley-style wheat growth sprite that changes with each
 * growth stage. Pre-mature stages use per-stage pixel-art PNGs; the mature
 * stage reuses the existing golden-sheaf sprite from CROP_SPRITES.wheat.
 *
 * Wrap in <Suspense> at the call site (FarmField already does this per tile).
 */
function WheatSpriteInner({ daysGrown }: WheatSpriteProps) {
  if (daysGrown >= 4) {
    // Stage 3: mature — golden wheat sheaf, slightly taller billboard
    return <BillboardSprite path={CROP_SPRITES.wheat} height={1.1} billboard={false} pixelated />;
  }

  // Stages 0-2: use the dedicated per-stage sprites
  const spritePath = WHEAT_STAGE_SPRITES[daysGrown] ?? WHEAT_STAGE_SPRITES[0];

  // Scale height with growth stage so the wheat visually "grows" each day
  // Stage 0 = seed (small), stage 1 = sprout (medium), stage 2 = young (taller)
  const heights: readonly [number, number, number] = [0.3, 0.55, 0.85];
  const height = heights[daysGrown] ?? 0.3;

  return <BillboardSprite path={spritePath} height={height} billboard={false} pixelated />;
}

/**
 * Public wrapper with its own Suspense boundary so callers don't crash when
 * the texture is still loading.
 */
export function WheatSprite({ daysGrown }: WheatSpriteProps) {
  return (
    <Suspense fallback={null}>
      <WheatSpriteInner daysGrown={daysGrown} />
    </Suspense>
  );
}
