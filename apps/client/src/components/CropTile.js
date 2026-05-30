import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CROPS, stageForDayCount, isMature } from '../systems/farming/CropDefs';
import { CROP_SPRITES } from '../content/assets';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

/**
 * Animated 3D crop tile for a single planted farm plot.
 *
 * Animations driven by useFrame:
 *   idle bob   — gentle vertical oscillation, phase-offset by tile position
 *   stage pop  — scale overshoot bounce when daysGrown crosses a new stage
 *   mature pulse — slow breathing scale when the crop is ready to harvest
 *   harvest burst — upward float + shrink when harvesting prop is true
 */
export function CropTile({ tile, position, harvesting = false }) {
  const groupRef = useRef(null);
  const elapsed = useRef(0);
  const popProgress = useRef(1); // 1 = animation done
  const harvestProgress = useRef(0);
  const prevStageIndex = useRef(-1);

  const cropDef = CROPS[tile.crop];
  const stage = stageForDayCount(cropDef, tile.daysGrown);
  const mature = isMature(cropDef, tile.daysGrown);

  // Trigger pop animation when growth stage advances
  useEffect(() => {
    const cur = stage.index;
    if (prevStageIndex.current !== -1 && cur !== prevStageIndex.current) {
      popProgress.current = 0;
    }
    prevStageIndex.current = cur;
  }, [stage.index]);

  // Reset harvest animation when harvesting prop becomes true
  useEffect(() => {
    if (harvesting) {
      harvestProgress.current = 0;
    }
  }, [harvesting]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    elapsed.current += delta;

    if (harvesting) {
      // Harvest burst: float up and shrink to zero
      harvestProgress.current = Math.min(1, harvestProgress.current + delta * 3.5);
      group.position.y = harvestProgress.current * 0.6;
      group.scale.setScalar(Math.max(0, 1 - harvestProgress.current * 1.4));
      return;
    }

    // Idle bob — unique phase per tile so nearby crops don't synchronise
    const phase = position[0] * 1.3 + position[2] * 0.9;
    const bob = Math.sin(elapsed.current * 1.8 + phase) * 0.035;

    // Pop animation on stage advance (0 → 1 over ~0.4 s)
    if (popProgress.current < 1) {
      popProgress.current = Math.min(1, popProgress.current + delta * 5);
    }
    const p = popProgress.current;
    // Overshoot spring: grows to 1.3 in first half, returns to 1.0
    const popScale = p < 0.5 ? 1 + p * 2 * 0.3 : 1.3 - (p - 0.5) * 2 * 0.3;

    // Mature pulse: slow breathing when harvestable
    const pulseScale = mature ? 1 + Math.sin(elapsed.current * 2.5) * 0.06 : 1;

    group.scale.setScalar(popScale * pulseScale);
    group.position.y = bob;
  });

  const cropSpritePath = CROP_SPRITES[tile.crop];

  return (
    <group ref={groupRef}>
      {/* Pre-mature: stage-coloured cone that grows taller each stage */}
      {!mature && (
        <mesh position={[0, 0.02 + (0.18 + stage.index * 0.09), 0]} castShadow>
          <coneGeometry args={[0.12 + stage.index * 0.02, 0.35 + stage.index * 0.18, 7]} />
          <meshStandardMaterial color={stage.color} roughness={0.55} />
        </mesh>
      )}

      {/* Mature: billboard sprite (existing asset) */}
      {mature && cropSpritePath && (
        <BillboardSprite path={cropSpritePath} height={1.1} billboard={false} />
      )}

      {/* Mature indicator: golden ring on the soil */}
      {mature && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.29, 24]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={0.55}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  );
}
