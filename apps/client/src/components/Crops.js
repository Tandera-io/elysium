import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BillboardSprite } from '../engine/loader/BillboardSprite';
import { CROP_SPRITES } from '../content/assets';
import { stageForDayCount } from '../systems/farming/CropDefs';

/**
 * Animated cone that plays a sprout pop-in when first mounted, then gently
 * sways to signal the plant is alive and growing.
 */
function SproutCone({ color, stageIndex }) {
  const meshRef = useRef(null);
  const mountTime = useRef(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.getElapsedTime();
    if (mountTime.current === null) mountTime.current = t;
    const age = t - mountTime.current;

    if (age < 0.5) {
      // Pop-in: scale from 0 → 1 with ease-out
      const p = age / 0.5;
      const eased = p * (2 - p);
      mesh.scale.set(eased, eased, eased);
    } else {
      // Gentle sway + bob to indicate life
      mesh.rotation.z = Math.sin(t * 1.5 + stageIndex * 1.2) * 0.08;
      mesh.scale.set(1, 1 + Math.sin(t * 2 + stageIndex * 0.5) * 0.04, 1);
    }
  });

  // Cone grows taller with each stage index
  const r = 0.12 + stageIndex * 0.03;
  const h = 0.3 + stageIndex * 0.12;

  return (
    <mesh ref={meshRef} position={[0, 0.2, 0]} castShadow>
      <coneGeometry args={[r, h, 6]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * Mature crop sprite with a spring pop-in animation that plays once on mount,
 * followed by a subtle idle bob to signal harvestability.
 */
function MatureCrop({ cropId }) {
  const groupRef = useRef(null);
  const mountTime = useRef(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.getElapsedTime();
    if (mountTime.current === null) mountTime.current = t;
    const age = t - mountTime.current;

    if (age < 0.6) {
      // Spring overshoot pop-in
      const p = age / 0.6;
      const scale = 1 + Math.sin(p * Math.PI) * 0.25;
      group.scale.set(scale, scale, scale);
    } else {
      group.scale.set(1, 1, 1);
      // Idle bob signals readiness for harvest
      group.position.y = Math.sin(t * 0.8) * 0.03;
    }
  });

  const spritePath = CROP_SPRITES[cropId];
  if (!spritePath) return null;

  return (
    <group ref={groupRef}>
      <BillboardSprite path={spritePath} height={1.1} billboard={false} />
    </group>
  );
}

/**
 * Top-level crop visual: picks between the growing sprout cone (with
 * stage-appropriate color and sway) and the mature sprite (with pop-in).
 * Drop this inside a positioned <group> aligned to the tile centre.
 */
export function CropVisual({ tile, cropDef }) {
  if (tile.kind !== 'planted') return null;

  const stage = stageForDayCount(cropDef, tile.daysGrown);
  const mature = tile.daysGrown >= cropDef.daysToMature;

  if (mature) {
    return <MatureCrop cropId={tile.crop} />;
  }

  return <SproutCone color={stage.color} stageIndex={stage.index} />;
}
