import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Mesh } from 'three';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { CROP_SPRITES } from '../../content/assets';

interface CropGrowthAnimationProps {
  stageIndex: number;
  stageColor: string;
  isHarvestable: boolean;
  cropId?: keyof typeof CROP_SPRITES;
}

function GrowingCone({
  stageIndex,
  stageColor,
  isHarvestable,
}: Omit<CropGrowthAnimationProps, 'cropId'>) {
  const meshRef = useRef<Mesh>(null);
  const height = 0.15 + stageIndex * 0.12;

  useFrame(({ clock }) => {
    if (meshRef.current && isHarvestable) {
      meshRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <coneGeometry args={[0.12, height, 6]} />
      <meshStandardMaterial color={stageColor} />
    </mesh>
  );
}

export function CropGrowthAnimation({
  stageIndex,
  stageColor,
  isHarvestable,
  cropId,
}: CropGrowthAnimationProps) {
  if (isHarvestable && cropId && CROP_SPRITES[cropId]) {
    return (
      <Suspense
        fallback={<GrowingCone stageIndex={stageIndex} stageColor={stageColor} isHarvestable />}
      >
        <BillboardSprite path={CROP_SPRITES[cropId]} height={0.9} billboard={false} />
      </Suspense>
    );
  }
  return (
    <GrowingCone stageIndex={stageIndex} stageColor={stageColor} isHarvestable={isHarvestable} />
  );
}
