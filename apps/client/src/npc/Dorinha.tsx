/**
 * Dorinha — animated sprite component for the seed vendor NPC.
 *
 * Uses SpriteAnimator for frame-based walk animation when a walk cycle is
 * registered in WALK_CYCLES, and adds a subtle positional bob while walking
 * to differentiate motion from the idle state.
 */

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { SpriteAnimator } from '../engine/loader/SpriteAnimator';
import { BillboardSprite } from '../engine/loader/BillboardSprite';
import { SPRITES, WALK_CYCLES } from '../content/assets';

interface DorinhaSpriteProps {
  moving: boolean;
}

function DorinhaCapsuleFallback() {
  return (
    <mesh castShadow position={[0, 0.5, 0]}>
      <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
      <meshStandardMaterial color="#5fcc8a" />
    </mesh>
  );
}

function DorinhaSpriteInner({ moving }: DorinhaSpriteProps) {
  const groupRef = useRef<Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (moving) {
      elapsed.current += delta;
      // Subtle vertical bob (4 bobs/s, 0.04 unit amplitude) while walking
      g.position.y = Math.sin(elapsed.current * Math.PI * 4) * 0.04;
    } else {
      elapsed.current = 0;
      g.position.y = 0;
    }
  });

  const cycle = WALK_CYCLES.dorinha;
  const inner =
    cycle && cycle.length > 0 ? (
      <SpriteAnimator frames={cycle} fps={6} playing={moving} height={1.6} />
    ) : (
      <BillboardSprite path={SPRITES.dorinha} height={1.6} />
    );

  return <group ref={groupRef}>{inner}</group>;
}

/** Renders Dorinha's sprite with walking / idle animation. */
export function DorinhaSprite({ moving }: DorinhaSpriteProps) {
  return (
    <Suspense fallback={<DorinhaCapsuleFallback />}>
      <DorinhaSpriteInner moving={moving} />
    </Suspense>
  );
}
