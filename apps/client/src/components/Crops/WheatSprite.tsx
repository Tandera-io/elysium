import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { CROP_SPRITES, WHEAT_STAGE_SPRITES } from '../../content/assets';

interface WheatSpriteProps {
  /** Days since the wheat was planted. Determines which growth stage to render. */
  daysGrown: number;
}

/**
 * Renders the correct wheat growth-stage sprite in the 3D scene.
 * Stages 0-2 use WHEAT_STAGE_SPRITES; stage 3+ (mature) uses CROP_SPRITES.wheat.
 */
export function WheatSprite({ daysGrown }: WheatSpriteProps) {
  const path =
    daysGrown >= WHEAT_STAGE_SPRITES.length
      ? CROP_SPRITES.wheat
      : (WHEAT_STAGE_SPRITES[daysGrown] ?? WHEAT_STAGE_SPRITES[0]);

  return <BillboardSprite path={path} height={0.9} billboard={false} />;
}
