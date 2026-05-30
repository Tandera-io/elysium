import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, NearestFilter, TextureLoader } from 'three';
import { CROPS, stageForDayCount, isMature } from '../../systems/farming/CropDefs';
import { CROP_GROWTH_SPRITES, CROP_SPRITES } from '../../content/assets';
import type { CropId } from '../../systems/farming/CropDefs';

interface CropGrowthStageSpriteProps {
  cropId: CropId;
  daysGrown: number;
  /** Height of the sprite in world units. Scales with growth stage. */
  maxHeight?: number;
  /** When true, sprite rotates to face camera each frame. */
  billboard?: boolean;
}

/**
 * Renders the correct growth-stage sprite for a planted crop in the 3D world.
 *
 * Stages:
 *   - stage 0 (seed)    → tiny sprite, barely visible
 *   - stage 1 (sprout)  → small green shoots
 *   - stage 2 (growing) → mid-height foliage
 *   - last stage (mature/harvest-ready) → full sprite; uses CROP_SPRITES if available
 *
 * The sprite height scales linearly from 0.25 (seed) to maxHeight (mature),
 * giving a smooth sense of growth even between day ticks.
 */
export function CropGrowthStageSprite({
  cropId,
  daysGrown,
  maxHeight = 1.0,
  billboard = false,
}: CropGrowthStageSpriteProps) {
  const cropDef = CROPS[cropId];
  const mature = isMature(cropDef, daysGrown);
  const currentStage = stageForDayCount(cropDef, daysGrown);

  // Determine which sprite paths to use
  const growthPaths = CROP_GROWTH_SPRITES[cropId] ?? [];
  const maturePath = CROP_SPRITES[cropId as keyof typeof CROP_SPRITES];

  // For mature crops prefer the high-quality ripe sprite from CROP_SPRITES;
  // fall back to the last growth-stage placeholder if it doesn't exist.
  const spritePath: string =
    mature && maturePath
      ? maturePath
      : (growthPaths[currentStage.index] ??
        growthPaths[growthPaths.length - 1] ??
        'assets/crops/seed.png');

  // Load all growth stage textures up-front to avoid pop-in on stage advance.
  // We load the mature sprite separately since it may live in a different cache.
  const stagePaths = useMemo(
    () => growthPaths.map((p: string) => `/${p}`),
    [cropId], // growthPaths reference is stable per cropId
  );
  const maturePaths = useMemo(
    () => (maturePath ? [`/${maturePath}`] : []),
    [cropId], // maturePath reference is stable per cropId
  );

  // useLoader accepts an array; result is an array of Texture
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageTextures = useLoader(TextureLoader, stagePaths as any) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matureTextures = useLoader(TextureLoader, maturePaths as any) as any;

  const meshRef = useRef<Mesh>(null);

  // Nearest-filter for pixel art crispness
  useMemo(() => {
    const all = [
      ...(Array.isArray(stageTextures) ? stageTextures : [stageTextures]),
      ...(Array.isArray(matureTextures) ? matureTextures : maturePath ? [matureTextures] : []),
    ];
    for (const t of all) {
      if (!t) continue;
      t.magFilter = NearestFilter;
      t.minFilter = NearestFilter;
      t.needsUpdate = true;
    }
  }, [stageTextures, matureTextures, maturePath]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !billboard) return;
    mesh.rotation.y = Math.atan2(
      camera.position.x - mesh.position.x,
      camera.position.z - mesh.position.z,
    );
  });

  // Pick the active texture based on current path
  const allTextures = useMemo(() => {
    const map: Record<string, object> = {};
    const stArr = Array.isArray(stageTextures) ? stageTextures : [stageTextures];
    stagePaths.forEach((p: string, i: number) => {
      if (stArr[i]) map[p] = stArr[i];
    });
    if (maturePath && matureTextures) {
      const mt = Array.isArray(matureTextures) ? matureTextures[0] : matureTextures;
      if (mt) map[`/${maturePath}`] = mt;
    }
    return map;
  }, [stageTextures, matureTextures, stagePaths, maturePath]);

  const activeTexture =
    allTextures[`/${spritePath}`] ??
    (Array.isArray(stageTextures) ? stageTextures[0] : stageTextures);

  // Height scales linearly: seed = 25% of maxHeight, each stage adds a share
  const totalStages = cropDef.stages.length;
  const stageProgress = Math.min(currentStage.index / Math.max(totalStages - 1, 1), 1);
  const height = maxHeight * (0.25 + 0.75 * stageProgress);

  const aspect = activeTexture?.image ? activeTexture.image.width / activeTexture.image.height : 1;
  const width = height * aspect;

  if (!activeTexture) return null;

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={activeTexture} transparent alphaTest={0.1} depthWrite />
    </mesh>
  );
}
