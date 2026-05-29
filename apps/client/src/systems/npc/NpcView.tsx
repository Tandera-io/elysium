import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { SpriteAnimator } from '../../engine/loader/SpriteAnimator';
import { useNpcStore } from './npcStore';
import { SPRITES, WALK_CYCLES, type SpriteSlot } from '../../content/assets';

/** Cápsula vermelha while sprite streams in (or if it's missing entirely). */
function NpcCapsuleFallback() {
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#d35a5a" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  );
}

function spriteFor(npcId: string): string | null {
  const key = npcId as SpriteSlot;
  return SPRITES[key] ?? null;
}

function walkCycleFor(npcId: string): string[] | null {
  const key = npcId as SpriteSlot;
  const cycle = WALK_CYCLES[key];
  return cycle && cycle.length > 1 ? cycle : null;
}

/**
 * Bridges a frame-level movingRef into the `playing` prop of SpriteAnimator.
 * Re-renders only when the moving state transitions (not every frame).
 */
function NpcAnimator({
  frames,
  movingRef,
}: {
  frames: string[];
  movingRef: React.RefObject<boolean>;
}) {
  const [moving, setMoving] = useState(false);
  const lastRef = useRef(false);

  useFrame(() => {
    const now = movingRef.current ?? false;
    if (now !== lastRef.current) {
      lastRef.current = now;
      setMoving(now);
    }
  });

  return <SpriteAnimator frames={frames} fps={6} playing={moving} height={1.6} />;
}

/**
 * Renders a single NPC. Detects position changes each frame to drive the
 * walk animation for NPCs that have a WALK_CYCLES entry.
 */
function NpcEntity({ npcId }: { npcId: string }) {
  const worldPos = useNpcStore((s) => s.npcs[npcId]?.worldPos);
  const prevPos = useRef<{ x: number; z: number } | null>(null);
  const movingRef = useRef(false);

  useFrame(() => {
    if (!worldPos) return;
    const prev = prevPos.current;
    movingRef.current =
      prev !== null &&
      (Math.abs(worldPos.x - prev.x) > 0.0001 || Math.abs(worldPos.z - prev.z) > 0.0001);
    prevPos.current = { x: worldPos.x, z: worldPos.z };
  });

  if (!worldPos) return null;

  const cycle = walkCycleFor(npcId);
  const spritePath = spriteFor(npcId);
  const hasSprite = cycle !== null || spritePath !== null;

  return (
    <group position={[worldPos.x, 0, worldPos.z]}>
      {hasSprite ? (
        <Suspense fallback={<NpcCapsuleFallback />}>
          {cycle ? (
            <NpcAnimator frames={cycle} movingRef={movingRef} />
          ) : (
            <BillboardSprite path={spritePath!} height={1.6} />
          )}
        </Suspense>
      ) : (
        <NpcCapsuleFallback />
      )}
    </group>
  );
}

/** Renders each NPC as a billboarded sprite (animated if walk cycle registered). */
export function NpcView() {
  const npcIds = useNpcStore((s) => Object.keys(s.npcs));
  return (
    <group>
      {npcIds.map((id) => (
        <NpcEntity key={id} npcId={id} />
      ))}
    </group>
  );
}
