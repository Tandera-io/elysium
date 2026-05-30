import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, NearestFilter, TextureLoader } from 'three';
import { CROPS, stageForDayCount, isMature, type CropId } from '../../systems/farming/CropDefs';
import { CROP_SPRITES, CROP_STAGE_SPRITES } from '../../content/assets';

interface AnimConfig {
  type: 'none' | 'pulse' | 'sway' | 'bob';
  speed: number;
  amplitude: number;
}

/**
 * Animation parameters per growth stage index.
 * Stage 0 (seed): no movement.
 * Stage 1 (sprout): gentle scale pulse.
 * Stage 2+ (growing): soft Y-axis sway.
 * Mature: idle vertical bobbing.
 */
const STAGE_ANIM: AnimConfig[] = [
  { type: 'none', speed: 0, amplitude: 0 },
  { type: 'pulse', speed: 1.5, amplitude: 0.06 },
  { type: 'sway', speed: 0.8, amplitude: 0.04 },
  { type: 'sway', speed: 0.6, amplitude: 0.06 },
  { type: 'sway', speed: 0.5, amplitude: 0.08 },
];

interface StageSpriteProps {
  path: string;
  height: number;
  animType: AnimConfig['type'];
  speed: number;
  amplitude: number;
  phaseOffset: number;
}

function StageSprite({ path, height, animType, speed, amplitude, phaseOffset }: StageSpriteProps) {
  const texture = useLoader(TextureLoader, `/${path}`);
  const meshRef = useRef<Mesh>(null);

  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 0.5;
  const width = height * aspect;

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime * speed + phaseOffset;

    if (animType === 'pulse') {
      const s = 1 + Math.sin(t) * amplitude;
      mesh.scale.set(s, s, s);
    } else if (animType === 'sway') {
      mesh.rotation.z = Math.sin(t) * amplitude;
      mesh.position.y = height / 2 + Math.sin(t * 1.3) * 0.02;
    } else if (animType === 'bob') {
      mesh.position.y = height / 2 + Math.sin(t) * amplitude;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.1} depthWrite />
    </mesh>
  );
}

interface CropProps {
  cropId: CropId;
  daysGrown: number;
  /** Per-tile phase offset so identical crops don't animate in perfect sync. */
  phaseOffset?: number;
}

/**
 * Renders a planted crop tile with a stage-appropriate sprite and animation.
 * Each growth stage shows a distinct sprite (seed → sprout → growing → mature)
 * with stage-matched animation intensity.
 */
export function Crop({ cropId, daysGrown, phaseOffset = 0 }: CropProps) {
  const def = CROPS[cropId];
  if (!def) return null;

  const mature = isMature(def, daysGrown);
  const stage = stageForDayCount(def, daysGrown);
  const stageIndex = stage.index;

  const stagePaths = CROP_STAGE_SPRITES[cropId];
  const maturePath = CROP_SPRITES[cropId];

  let spritePath: string;
  let height: number;
  let animConfig: AnimConfig;

  if (mature && maturePath) {
    spritePath = maturePath;
    height = 1.1;
    animConfig = { type: 'bob', speed: 0.5, amplitude: 0.04 };
  } else if (stagePaths?.[stageIndex] != null) {
    spritePath = stagePaths[stageIndex];
    const stageFraction = def.stages.length > 1 ? stageIndex / (def.stages.length - 1) : 0;
    height = 0.3 + stageFraction * 0.7;
    const fallback: AnimConfig = { type: 'none', speed: 0, amplitude: 0 };
    animConfig = STAGE_ANIM[Math.min(stageIndex, STAGE_ANIM.length - 1)] ?? fallback;
  } else {
    return null;
  }

  return (
    <StageSprite
      path={spritePath}
      height={height}
      animType={animConfig.type}
      speed={animConfig.speed}
      amplitude={animConfig.amplitude}
      phaseOffset={phaseOffset}
    />
  );
}

export default Crop;
