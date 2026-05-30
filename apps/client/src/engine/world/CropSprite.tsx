import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import { BillboardSprite } from '../loader/BillboardSprite';
import type { CropId } from '../../systems/farming/CropDefs';
import { CROP_SPRITES } from '../../content/assets';

interface CropSpriteProps {
  cropId: CropId;
  stageIndex: number;
  totalStages: number;
  stageColor: string;
  mature: boolean;
}

export function CropSprite({
  cropId,
  stageIndex,
  totalStages: _totalStages,
  stageColor,
  mature,
}: CropSpriteProps) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime;
    const phase = stageIndex * 1.1;
    group.rotation.z = Math.sin(t * 1.8 + phase) * 0.05;
    group.scale.y = 1 + Math.sin(t * 2.2 + stageIndex * 0.7) * 0.025;
  });

  if (mature) {
    const path = CROP_SPRITES[cropId as keyof typeof CROP_SPRITES];
    if (path) return <BillboardSprite path={path} height={1.1} billboard={false} />;
    return null;
  }

  if (stageIndex === 0) {
    return (
      <group ref={groupRef} position={[0, 0.025, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.1, 0.05, 6]} />
          <meshStandardMaterial color={stageColor} />
        </mesh>
      </group>
    );
  }

  if (stageIndex === 1) {
    return (
      <group ref={groupRef} position={[0, 0.09, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.09, 0.18, 6]} />
          <meshStandardMaterial color={stageColor} />
        </mesh>
      </group>
    );
  }

  if (stageIndex === 2) {
    return (
      <group ref={groupRef} position={[0, 0.15, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.13, 0.3, 6]} />
          <meshStandardMaterial color={stageColor} />
        </mesh>
      </group>
    );
  }

  // stage 3+ — tall bush with two overlapping cones
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.21, 0]} castShadow>
        <coneGeometry args={[0.16, 0.42, 7]} />
        <meshStandardMaterial color={stageColor} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <coneGeometry args={[0.1, 0.22, 7]} />
        <meshStandardMaterial color={stageColor} />
      </mesh>
    </group>
  );
}
