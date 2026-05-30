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
  const cycle = WALK_CYCLES[key];
  return cycle && cycle.length > 1 ? cycle : null;
}

/** Renders each NPC as a billboarded sprite if a sprite is registered for them.
 *  NPCs with a walk cycle defined in WALK_CYCLES play their walk animation
 *  continuously (they are always "on duty" patrolling their location). */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        const walkCycle = walkCycleFor(def.id);
        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
            {spritePath ? (
              <Suspense fallback={<NpcCapsuleFallback />}>
                {walkCycle ? (
                  <SpriteAnimator frames={walkCycle} fps={4} playing height={1.6} />
                ) : (
                  <BillboardSprite path={spritePath} height={1.6} />
                )}
              </Suspense>
            ) : (
              <NpcCapsuleFallback />
            )}
          </group>
        );
      })}
    </group>
  );
}
