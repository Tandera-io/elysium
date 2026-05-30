import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Mesh, NearestFilter, Texture, TextureLoader } from 'three';
import type { CropId } from '../../systems/farming/CropDefs';
import { CROPS, stageForDayCount, isMature } from '../../systems/farming/CropDefs';
import { CROP_SPRITES, PLOT_SPRITES } from '../../content/assets';

export interface CropGrowthProps {
  cropId: CropId;
  daysGrown: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

/**
 * Maps a stage index (0-based) to the matching PLOT_SPRITES key.
 * Stage 0 = seed, 1 = sprout, 2+ = grown.
 */
function plotSpriteKeyForStage(stageIndex: number): keyof typeof PLOT_SPRITES {
  if (stageIndex === 0) return 'seed';
  if (stageIndex === 1) return 'sprout';
  return 'grown';
}

/** World-unit height for each stage group (seed/sprout/grown/mature). */
const STAGE_HEIGHTS = [0.25, 0.45, 0.75, 1.1] as const;

function heightForStage(stageIndex: number, mature: boolean): number {
  if (mature) return STAGE_HEIGHTS[3];
  return STAGE_HEIGHTS[Math.min(stageIndex, 2)] ?? STAGE_HEIGHTS[0];
}

const BOB_AMPLITUDE = 0.025; // world units
const BOB_SPEED = 1.8; // radians / second

/**
 * Inner mesh that bobs while a crop is still growing.
 */
function GrowingMesh({
  texture,
  height,
  onClick,
}: {
  texture: Texture;
  height: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const elapsed = useRef(0);

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    elapsed.current += delta * BOB_SPEED;
    mesh.position.y = height / 2 + Math.sin(elapsed.current) * BOB_AMPLITUDE;
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow onClick={onClick}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}

/**
 * Static mature plant mesh (no bob — the crop is ready to harvest).
 */
function MatureMesh({ texture, height }: { texture: Texture; height: number }) {
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;
  return (
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}

/**
 * Renders a planted crop with animated growing stages.
 *
 * - Stages 0–N-1 use generic PLOT_SPRITES (seed → sprout → grown) with a
 *   subtle vertical bob to convey life.
 * - The final (mature/harvestable) stage uses the crop-specific ripe sprite
 *   from CROP_SPRITES when available, otherwise falls back to the generic
 *   harvestable plot sprite.  The mature plant is static (no bob).
 */
export function CropGrowth({ cropId, daysGrown, onClick }: CropGrowthProps) {
  // Derive growth state — CROPS[cropId] always exists for valid CropId values.
  const def = CROPS[cropId];
  const mature = def ? isMature(def, daysGrown) : false;
  const stage = def ? stageForDayCount(def, daysGrown) : CROPS.wheat.stages[0]!;

  // Resolve the sprite path.  Mature crops use the crop-specific ripe sprite;
  // growing crops use generic PLOT_SPRITES keyed by stage index.
  const spritePath = useMemo<string>(() => {
    if (mature) {
      const ripePath = CROP_SPRITES[cropId as keyof typeof CROP_SPRITES];
      return ripePath ?? PLOT_SPRITES.harvestable;
    }
    return PLOT_SPRITES[plotSpriteKeyForStage(stage.index)];
  }, [mature, cropId, stage.index]);

  // CROP_SPRITES values are public-root strings (e.g. "sprites/cache/abc.png")
  // and need a leading slash; PLOT_SPRITES values are Vite ?url imports (already
  // absolute or data URIs).
  const loadPath = useMemo(
    () =>
      spritePath.startsWith('/') || spritePath.startsWith('data:') || spritePath.startsWith('http')
        ? spritePath
        : `/${spritePath}`,
    [spritePath],
  );

  const texture = useLoader(TextureLoader, loadPath);

  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  if (!def) return null;

  const height = heightForStage(stage.index, mature);

  if (mature) {
    return <MatureMesh texture={texture} height={height} />;
  }
  return <GrowingMesh texture={texture} height={height} onClick={onClick} />;
}
