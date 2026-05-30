/**
 * CropComponent — renders a growing crop as a 3-D placeholder mesh.
 *
 * Visual stages map to the CropDef stage index:
 *   Stage 0  – tiny sphere (seed bump in soil)
 *   Stage 1  – short, thin cone (sprout piercing soil)
 *   Stage 2+ – taller, wider cone scaled by growth ratio
 *   Mature   – full-size BillboardSprite from CROP_SPRITES
 *
 * Geometry for non-mature stages breathes (scale pulse) each frame.
 * Mature sprites sway laterally to signal harvestability.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { CROPS, stageForDayCount, isMature } from '../systems/farming/CropDefs';
import type { CropId } from '../systems/farming/CropDefs';
import { CROP_SPRITES } from '../content/assets';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

interface CropComponentProps {
  cropId: CropId;
  daysGrown: number;
}

// Stage-specific geometry tunables (radius, height) for the cone placeholder.
const STAGE_CONE: Record<number, [radius: number, height: number]> = {
  0: [0.07, 0.14], // seed bump
  1: [0.1, 0.3], // sprout
  2: [0.14, 0.5], // young plant
  3: [0.18, 0.7], // maturing
};

const DEFAULT_CONE: [number, number] = [0.2, 0.85];

function GrowingMesh({
  color,
  stageIndex,
  growthRatio,
}: {
  color: string;
  stageIndex: number;
  growthRatio: number;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // Breathing pulse: ±3 % of scale, period ≈ 2 s
    const pulse = 1 + Math.sin(clock.elapsedTime * Math.PI) * 0.03;
    mesh.scale.setScalar(pulse);
  });

  if (stageIndex === 0) {
    // Seed: small sphere peeking out of soil
    return (
      <mesh ref={meshRef} position={[0, 0.06, 0]} castShadow>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  const [baseR, baseH] = STAGE_CONE[stageIndex] ?? DEFAULT_CONE;
  const r = baseR * (0.8 + growthRatio * 0.4);
  const h = baseH * (0.8 + growthRatio * 0.4);

  return (
    <mesh ref={meshRef} position={[0, h / 2, 0]} castShadow>
      <coneGeometry args={[r, h, 7]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function MatureSprite({ cropId }: { cropId: CropId }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    // Gentle lateral sway to signal ready-to-harvest
    group.rotation.z = Math.sin(clock.elapsedTime * 1.8) * 0.06;
  });

  const spritePath = CROP_SPRITES[cropId];
  if (!spritePath) return null;

  return (
    <group ref={groupRef}>
      <BillboardSprite path={spritePath} height={1.1} billboard={false} />
    </group>
  );
}

export function CropComponent({ cropId, daysGrown }: CropComponentProps) {
  const def = CROPS[cropId];
  const mature = isMature(def, daysGrown);

  if (mature) {
    return <MatureSprite cropId={cropId} />;
  }

  const stage = stageForDayCount(def, daysGrown);
  // growthRatio: progress through the current stage (0 → 1)
  let cumulative = 0;
  for (let i = 0; i < stage.index; i++) {
    cumulative += def.stages[i]?.daysInStage ?? 0;
  }
  const daysIntoStage = daysGrown - cumulative;
  const growthRatio = stage.daysInStage > 0 ? Math.min(daysIntoStage / stage.daysInStage, 1) : 1;

  return <GrowingMesh color={stage.color} stageIndex={stage.index} growthRatio={growthRatio} />;
}
