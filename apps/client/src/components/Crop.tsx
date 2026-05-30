import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { CROPS, stageForDayCount, isMature } from '../systems/farming/CropDefs';
import type { CropId } from '../systems/farming/CropDefs';
import { CROP_SPRITES } from '../content/assets';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

interface CropProps {
  cropId: CropId;
  daysGrown: number;
  /** Random phase offset so neighboring crops sway out of sync. */
  swayPhase?: number;
}

/**
 * Renders a crop with per-stage 3D geometry and smooth growth animations.
 * Stage 0 = seed bump, 1 = sprout, 2 = young plant, 3+ = mature.
 * Mature harvestable tiles show the full BillboardSprite with a gentle pulse.
 * Between stages the mesh scales up via lerp in useFrame, giving a visible
 * "growing" transition each time the game day advances.
 */
export function Crop({ cropId, daysGrown, swayPhase = 0 }: CropProps) {
  const groupRef = useRef<Group>(null);
  // Current animated scale, lerped toward targetScale each frame.
  const animScale = useRef(0.01);
  const swayTime = useRef(swayPhase);
  // Track which stage we last animated so we reset scale on stage change.
  const lastStageRef = useRef(-1);

  const def = CROPS[cropId];
  const stage = stageForDayCount(def, daysGrown);
  const mature = isMature(def, daysGrown);

  // Target display scale per stage — rises from small to full size.
  const targetScale = mature ? 1.0 : 0.2 + stage.index * 0.25;

  // When the stage advances, snap current scale to near-zero so the plant
  // "sprouts" visibly rather than jumping to the new size.
  if (stage.index !== lastStageRef.current) {
    animScale.current = 0.05;
    lastStageRef.current = stage.index;
  }

  // Geometry shape per growth stage.
  const stageShape: StageShape = useMemo(() => {
    return STAGE_SHAPES[Math.min(stage.index, STAGE_SHAPES.length - 1)] ?? STAGE_SEED;
  }, [stage.index]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Smooth scale-up after stage transition.
    animScale.current += (targetScale - animScale.current) * Math.min(1, delta * 4);
    g.scale.setScalar(animScale.current);

    // Continuous gentle sway — each crop has its own phase so the field
    // looks alive rather than every plant moving in perfect unison.
    swayTime.current += delta * (mature ? 0.8 : 1.4);
    g.rotation.z = Math.sin(swayTime.current) * (mature ? 0.03 : 0.06);
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

  const { stemH, stemR, capH, capR, yBase } = stageShape;

  return (
    <group ref={groupRef}>
      {/* Stem */}
      <mesh position={[0, yBase + stemH / 2, 0]} castShadow>
        <cylinderGeometry args={[stemR * 0.6, stemR, stemH, 6]} />
        <meshStandardMaterial color={stage.color} roughness={0.85} />
      </mesh>
      {/* Crown / leaf cap */}
      <mesh position={[0, yBase + stemH + capH * 0.4, 0]} castShadow>
        <coneGeometry args={[capR, capH, 7]} />
        <meshStandardMaterial color={stage.color} roughness={0.7} />
      </mesh>
    </group>
  );
}

interface StageShape {
  stemH: number;
  stemR: number;
  capH: number;
  capR: number;
  yBase: number;
}

const STAGE_SEED: StageShape = { stemH: 0.04, stemR: 0.04, capH: 0.06, capR: 0.06, yBase: 0.0 };

/** Per-stage geometry parameters. Index matches CropStage.index (clamped at last entry). */
const STAGE_SHAPES: readonly StageShape[] = [
  STAGE_SEED,
  // Stage 1 — sprout: thin shoot with a small tip
  { stemH: 0.18, stemR: 0.04, capH: 0.12, capR: 0.09, yBase: 0.0 },
  // Stage 2 — young: medium stem, wider leaf cone
  { stemH: 0.35, stemR: 0.05, capH: 0.22, capR: 0.16, yBase: 0.0 },
  // Stage 3 — growing: tall stem, broad canopy
  { stemH: 0.55, stemR: 0.06, capH: 0.32, capR: 0.22, yBase: 0.0 },
];
