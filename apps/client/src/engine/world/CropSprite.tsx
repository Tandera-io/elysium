import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Group, Mesh, NearestFilter, TextureLoader } from 'three';
import type { CropId } from '../../systems/farming/CropDefs';
import { CROP_SPRITES } from '../../content/assets';

// ─── Animation constants ────────────────────────────────────────────────────

/** Duration (seconds) for the grow-in scale-punch animation. */
const GROW_IN_DURATION = 0.5;
/** How far past 1.0 the scale overshoots before settling (spring feel). */
const OVERSHOOT = 0.35;
/** Idle sway amplitude in radians for mature sprites. */
const SWAY_AMPLITUDE = 0.08;
/** Idle sway frequency in Hz. */
const SWAY_FREQUENCY = 0.7;
/** Cone bob amplitude in world units. */
const BOB_AMPLITUDE = 0.04;
/** Cone bob frequency in Hz. */
const BOB_FREQUENCY = 1.2;

// ─── Grow-in animated cone (pre-mature stages) ──────────────────────────────

interface GrowingConeProps {
  color: string;
  /** Unique key that bumps when the stage changes so the animation replays. */
  stageKey: number;
}

/**
 * Color-coded placeholder cone used while a crop hasn't reached maturity.
 * Plays a scale-punch on mount / stage change, then gently bobs up and down.
 */
export function GrowingCone({ color, stageKey }: GrowingConeProps) {
  const groupRef = useRef<Group>(null);
  const animTime = useRef(0);
  // Track which stageKey we last animated for.
  const lastStageKey = useRef<number>(-1);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Reset timer whenever stage advances.
    if (lastStageKey.current !== stageKey) {
      lastStageKey.current = stageKey;
      animTime.current = 0;
    }

    animTime.current += delta;
    const t = animTime.current;

    // ── Grow-in scale punch (first GROW_IN_DURATION seconds) ──
    let scale = 1;
    if (t < GROW_IN_DURATION) {
      const progress = t / GROW_IN_DURATION; // 0 → 1
      // Spring-like curve: ease-out with overshoot then settle
      // Uses a decaying oscillation: scale = 1 + overshoot * e^(-6t) * sin(8πt)
      scale = 1 + OVERSHOOT * Math.exp(-6 * progress) * Math.sin(8 * Math.PI * progress);
    }
    group.scale.set(scale, scale, scale);

    // ── Continuous bob on Y position ──
    const bobY = BOB_AMPLITUDE * Math.sin(BOB_FREQUENCY * 2 * Math.PI * t);
    group.position.set(0, 0.2 + bobY, 0);
  });

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      <mesh castShadow>
        <coneGeometry args={[0.15, 0.4, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Animated mature crop sprite ────────────────────────────────────────────

interface MatureCropSpriteProps {
  cropId: CropId;
  /** Unique key that bumps when the crop first becomes mature so it pops in. */
  stageKey: number;
}

/**
 * Billboarded PNG sprite for mature/harvestable crops.
 * Plays a pop-in scale animation when first rendered, then gently sways.
 */
export function MatureCropSprite({ cropId, stageKey }: MatureCropSpriteProps) {
  const spritePath = CROP_SPRITES[cropId];
  const texture = useLoader(TextureLoader, `/${spritePath}`);
  const meshRef = useRef<Mesh>(null);
  const animTime = useRef(0);
  const lastStageKey = useRef<number>(-1);

  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const height = 1.1;
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Reset timer on stage change (e.g. becoming mature).
    if (lastStageKey.current !== stageKey) {
      lastStageKey.current = stageKey;
      animTime.current = 0;
    }

    animTime.current += delta;
    const t = animTime.current;

    // ── Pop-in scale punch ──
    let scale = 1;
    if (t < GROW_IN_DURATION) {
      const progress = t / GROW_IN_DURATION;
      scale = 1 + OVERSHOOT * Math.exp(-6 * progress) * Math.sin(8 * Math.PI * progress);
    }

    // ── Idle sway (sinusoidal Y rotation) ──
    const sway = SWAY_AMPLITUDE * Math.sin(SWAY_FREQUENCY * 2 * Math.PI * t);

    mesh.scale.set(scale, scale, scale);
    mesh.rotation.z = sway;
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}
