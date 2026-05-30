import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { CROPS, stageForDayCount, isMature, type CropId } from '../systems/farming/CropDefs';
import { CROP_SPRITES } from '../content/assets';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

interface CropComponentProps {
  cropId: CropId;
  daysGrown: number;
}

/**
 * Renders a crop at the correct growth stage with continuous frame animation.
 * Stages 0–N render progressively larger geometry that scales with the crop's
 * stage index. Mature crops render a pixel-art billboard that sways gently to
 * feel alive (Stardew-style).
 */
export function CropComponent({ cropId, daysGrown }: CropComponentProps) {
  const groupRef = useRef<Group>(null);
  const def = CROPS[cropId];
  const stage = stageForDayCount(def, daysGrown);
  const mature = isMature(def, daysGrown);
  const totalStages = def.stages.length - 1;
  const growthRatio = totalStages > 0 ? stage.index / totalStages : 0;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const t = performance.now() * 0.001;
    if (mature) {
      // Gentle lateral sway for harvestable crops — each crop offset by stageIndex
      // so identical plots don't sway in perfect sync.
      group.rotation.z = Math.sin(t * 1.2 + stage.index) * 0.06;
    } else {
      // Slow breathing scale for sprouting plants
      const pulse = 1 + Math.sin(t * 2.5 + stage.index) * 0.04;
      group.scale.setScalar(pulse);
    }
  });

  if (mature) {
    const spritePath = CROP_SPRITES[cropId as keyof typeof CROP_SPRITES];
    if (spritePath) {
      return (
        <group ref={groupRef}>
          <BillboardSprite path={spritePath} height={1.1} billboard={false} />
        </group>
      );
    }
  }

  // Growing stage geometry — scales from a seed bump (stage 0) up to a young
  // plant cone (stage N-1) proportionally to the crop's current growth ratio.
  const height = 0.1 + growthRatio * 0.55;
  const radius = 0.06 + growthRatio * 0.09;
  const yPos = height / 2;

  return (
    <group ref={groupRef}>
      <mesh position={[0, yPos, 0]} castShadow>
        {stage.index === 0 ? (
          <sphereGeometry args={[0.08, 6, 4]} />
        ) : (
          <coneGeometry args={[radius, height, 6]} />
        )}
        <meshStandardMaterial color={stage.color} />
      </mesh>
    </group>
  );
}
