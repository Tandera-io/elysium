import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import type { Group } from 'three';
import { CROP_SPRITES } from '../../content/assets';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { shapeForStage } from '../CropGrowthAnimation.js';

interface CropGrowthAnimationProps {
  /** Zero-based index of the current growth stage (0 = seeded, increases each day). */
  stageIndex: number;
  /** Hex color string from the CropDef stage definition. */
  stageColor: string;
  /** When true the plant is harvestable — shows a pulse to attract attention. */
  isHarvestable: boolean;
  /**
   * Crop id used to look up the mature sprite from CROP_SPRITES.
   * When provided and isHarvestable is true, renders the full-resolution
   * BillboardSprite instead of the procedural cone placeholder.
   */
  cropId?: keyof typeof CROP_SPRITES;
}

/**
 * CropGrowthAnimation — animated 3D crop plant for all growth stages.
 *
 * Visual progression:
 *   Stage 0 — tiny cone: freshly seeded soil mound
 *   Stage 1 — small cone: seedling shoot emerging
 *   Stage 2+ — mid-height cone + side leaf: actively growing stalk
 *   Harvestable — pulses for player attention; uses BillboardSprite when a
 *                 registered crop sprite is available, otherwise the tallest
 *                 cone config as a fallback.
 *
 * A continuous sway animation (rotation.x / rotation.z) makes plants feel
 * alive without requiring sprite sheets for intermediate growth stages.
 */
export function CropGrowthAnimation({
  stageIndex,
  stageColor,
  isHarvestable,
  cropId,
}: CropGrowthAnimationProps) {
  const groupRef = useRef<Group>(null);

  // For harvestable plants use the tallest stage config so the procedural
  // fallback looks appropriately mature before the sprite loads.
  const config = shapeForStage(isHarvestable ? 3 : stageIndex);

  const spritePath =
    isHarvestable && cropId && cropId in CROP_SPRITES ? CROP_SPRITES[cropId] : null;

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    // Sway on two axes with slightly different frequencies for a natural feel
    g.rotation.x = Math.sin(t * config.swayFreq) * config.swayAmplitude;
    g.rotation.z = Math.sin(t * config.swayFreq * 0.75 + 1.3) * config.swayAmplitude;
    // Harvestable plants pulse to draw player attention
    if (isHarvestable) {
      const pulse = 1 + Math.sin(t * 3.0) * 0.07;
      g.scale.setScalar(pulse);
    }
  });

  const yOffset = config.coneHeight / 2;

  return (
    <group ref={groupRef}>
      {/* Mature crop: BillboardSprite when available, procedural cone otherwise */}
      {isHarvestable && spritePath ? (
        <Suspense
          fallback={
            <mesh position={[0, yOffset, 0]}>
              <coneGeometry args={[config.coneRadius, config.coneHeight, config.segments]} />
              <meshStandardMaterial color={stageColor} />
            </mesh>
          }
        >
          <BillboardSprite path={spritePath} height={1.1} billboard={false} />
        </Suspense>
      ) : (
        <>
          {/* Primary stalk cone */}
          <mesh position={[0, yOffset, 0]}>
            <coneGeometry args={[config.coneRadius, config.coneHeight, config.segments]} />
            <meshStandardMaterial color={stageColor} />
          </mesh>

          {/* Side leaf — only visible from stage 2+ (the crop is clearly growing) */}
          {stageIndex >= 2 && (
            <mesh
              position={[config.coneRadius * 0.9, yOffset * 0.65, 0]}
              rotation={[0, 0, Math.PI / 2.5]}
            >
              <sphereGeometry args={[config.coneRadius * 0.55, 5, 4]} />
              <meshStandardMaterial color={stageColor} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}
