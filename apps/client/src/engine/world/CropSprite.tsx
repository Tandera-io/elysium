import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, NearestFilter, TextureLoader } from 'three';
import type { CropId } from '../../systems/farming/CropDefs';
import { CROP_SPRITES } from '../../content/assets';

const POPIN_DURATION = 0.45;
const BOUNCE_DURATION = 0.5;
const SWAY_AMP = 0.07;
const SWAY_FREQ = 1.2;

interface StageVisual {
  coneRadius: number;
  coneHeight: number;
  color: string;
}

const STAGE_VISUALS: StageVisual[] = [
  { coneRadius: 0.06, coneHeight: 0.12, color: '#5a4a2a' }, // seed mound
  { coneRadius: 0.1, coneHeight: 0.25, color: '#8db454' }, // sprout
  { coneRadius: 0.13, coneHeight: 0.45, color: '#6aab30' }, // young plant
  { coneRadius: 0.15, coneHeight: 0.65, color: '#4a9e1a' }, // almost mature
];

function getStageVisual(stageIndex: number): StageVisual {
  const clamped = Math.max(0, Math.min(stageIndex, STAGE_VISUALS.length - 1));
  return STAGE_VISUALS[clamped]!;
}

interface AnimatedConeProps {
  stageIndex: number;
  color: string;
  coneRadius: number;
  coneHeight: number;
  isMature: boolean;
}

/**
 * Animated placeholder cone for pre-mature crops.
 * Plays a pop-in on stage change, continuous sway for stage ≥ 1, and a
 * one-shot vertical bounce when the crop reaches maturity.
 */
export function AnimatedCone({
  stageIndex,
  color,
  coneRadius,
  coneHeight,
  isMature,
}: AnimatedConeProps) {
  const meshRef = useRef<Mesh>(null);
  const animTime = useRef(0);
  const inPopin = useRef(true);
  const inBounce = useRef(false);

  useEffect(() => {
    animTime.current = 0;
    inPopin.current = true;
    inBounce.current = isMature;
  }, [stageIndex, isMature]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    animTime.current += delta;
    const t = animTime.current;

    if (inPopin.current) {
      const progress = Math.min(t / POPIN_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mesh.scale.setScalar(eased);
      if (progress >= 1) {
        inPopin.current = false;
        animTime.current = 0;
      }
      return;
    }

    if (inBounce.current) {
      const progress = Math.min(t / BOUNCE_DURATION, 1);
      const bounceY = Math.sin(progress * Math.PI) * 0.35;
      mesh.position.y = coneHeight / 2 + bounceY;
      if (progress >= 1) {
        mesh.position.y = coneHeight / 2;
        inBounce.current = false;
      }
      return;
    }

    if (stageIndex >= 1) {
      const sway = Math.sin(t * SWAY_FREQ * Math.PI * 2) * SWAY_AMP;
      mesh.rotation.x = sway;
      mesh.rotation.z = sway * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, coneHeight / 2, 0]} castShadow>
      <coneGeometry args={[coneRadius, coneHeight, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

interface MatureSpriteProps {
  cropId: keyof typeof CROP_SPRITES;
  height?: number;
}

/**
 * Ripe crop sprite with elastic pop-in on mount and slow idle bob to
 * signal harvest-readiness.
 */
export function MatureSprite({ cropId, height = 1.1 }: MatureSpriteProps) {
  const path = CROP_SPRITES[cropId];
  const texture = useLoader(TextureLoader, `/${path}`);

  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  const meshRef = useRef<Mesh>(null);
  const animTime = useRef(0);
  const inPopin = useRef(true);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    animTime.current += delta;
    const t = animTime.current;

    if (inPopin.current) {
      const progress = Math.min(t / POPIN_DURATION, 1);
      const eased =
        progress < 0.85
          ? 1 - Math.pow(1 - progress / 0.85, 3)
          : 1 + Math.sin(((progress - 0.85) / 0.15) * Math.PI) * 0.08 * (1 - progress);
      mesh.scale.setScalar(Math.max(0, eased));
      if (progress >= 1) {
        mesh.scale.setScalar(1);
        inPopin.current = false;
        animTime.current = 0;
      }
      return;
    }

    // Slow idle bob — harvest-ready indicator.
    const bob = Math.sin(t * 0.9 * Math.PI * 2) * 0.04;
    mesh.position.y = height / 2 + bob;
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}

export interface CropSpriteProps {
  cropId: CropId;
  stageIndex: number;
  isMature: boolean;
}

/**
 * Renders a crop at the correct growth stage with animations:
 *
 *  - Stage 0 (seed):  tiny brown mound, pops in from scale 0.
 *  - Stage 1 (sprout): small green cone with gentle sway.
 *  - Stage 2+:        taller cone with sway.
 *  - Mature:          ripe sprite with elastic pop-in + slow idle bob.
 *
 * The pop-in replays automatically whenever the growth stage advances.
 */
export function CropSprite({ cropId, stageIndex, isMature }: CropSpriteProps) {
  if (isMature) {
    const spriteId = cropId as keyof typeof CROP_SPRITES;
    if (CROP_SPRITES[spriteId]) {
      return <MatureSprite cropId={spriteId} />;
    }
  }

  const vis = getStageVisual(stageIndex);
  return (
    <AnimatedCone
      stageIndex={stageIndex}
      color={vis.color}
      coneRadius={vis.coneRadius}
      coneHeight={vis.coneHeight}
      isMature={isMature}
    />
  );
}
