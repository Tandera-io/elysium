import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { SpriteAnimator } from '../../engine/loader/SpriteAnimator';
import { useNpcStore } from './npcStore';
import { SPRITES, WALK_CYCLES, type SpriteSlot } from '../../content/assets';
import { NPC_ANIM_FPS, NPC_MOVE_THRESHOLD } from '../../animation/NPCAnimations';

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

interface NpcEntityProps {
  id: string;
  spritePath: string;
}

/** Single NPC — picks animated or static sprite, detects motion each frame. */
function NpcEntity({ id, spritePath }: NpcEntityProps) {
  const cycle = WALK_CYCLES[id as SpriteSlot];
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const prevPos = useRef<{ x: number; z: number } | null>(null);

  useFrame(() => {
    const pos = useNpcStore.getState().npcs[id]?.worldPos;
    if (!pos) return;
    const isMoving =
      prevPos.current !== null &&
      (Math.abs(pos.x - prevPos.current.x) > NPC_MOVE_THRESHOLD ||
        Math.abs(pos.z - prevPos.current.z) > NPC_MOVE_THRESHOLD);
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving;
      setMoving(isMoving);
    }
    prevPos.current = { x: pos.x, z: pos.z };
  });

  if (cycle && cycle.length > 1) {
    return (
      <Suspense fallback={<NpcCapsuleFallback />}>
        <SpriteAnimator frames={cycle} fps={NPC_ANIM_FPS} playing={moving} height={1.6} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<NpcCapsuleFallback />}>
      <BillboardSprite path={spritePath} height={1.6} />
    </Suspense>
  );
}

/** Renders each NPC as a billboarded sprite if a sprite is registered for them. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
            {spritePath ? (
              <NpcEntity id={def.id} spritePath={spritePath} />
            ) : (
              <NpcCapsuleFallback />
            )}
          </group>
        );
      })}
    </group>
  );
}
