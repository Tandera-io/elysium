import { Suspense } from 'react';
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
  // Lookup is intentionally lenient — if no entry, return null and use capsule.
  const key = npcId as SpriteSlot;
  return SPRITES[key] ?? null;
}

function walkCycleFor(npcId: string): readonly string[] | null {
  const key = npcId as SpriteSlot;
  return WALK_CYCLES[key] ?? null;
}

interface NpcSpriteProps {
  npcId: string;
  moving?: boolean;
}

/** Renders an NPC sprite; uses SpriteAnimator when a walk cycle is registered. */
function NpcSprite({ npcId, moving = false }: NpcSpriteProps) {
  const cycle = walkCycleFor(npcId);
  if (cycle && cycle.length > 1) {
    return <SpriteAnimator frames={cycle} fps={6} playing={moving} height={1.6} />;
  }
  const spritePath = spriteFor(npcId);
  if (!spritePath) return null;
  return <BillboardSprite path={spritePath} height={1.6} />;
}

/** Renders each NPC as a billboarded sprite if a sprite is registered for them. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        const hasCycle = walkCycleFor(def.id) !== null;
        if (!spritePath && !hasCycle) {
          return (
            <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
              <NpcCapsuleFallback />
            </group>
          );
        }
        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
            <Suspense fallback={<NpcCapsuleFallback />}>
              <NpcSprite npcId={def.id} />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
