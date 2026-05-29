import { Suspense } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { useNpcStore } from './npcStore';
import { SPRITES, type SpriteSlot } from '../../content/assets';
import { DorinhaWalker } from './DorinhaWalker';

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

/** Renders each NPC as a billboarded sprite if a sprite is registered for them.
 *  Dorinha gets her own DorinhaWalker component with patrol + proximity logic. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {/* Dorinha has her own walking component; skip her in the generic static loop. */}
      <DorinhaWalker />
      {Object.values(npcs)
        .filter(({ def }) => def.id !== 'dorinha')
        .map(({ def, worldPos }) => {
          const spritePath = spriteFor(def.id);
          return (
            <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
              {spritePath ? (
                <Suspense fallback={<NpcCapsuleFallback />}>
                  <BillboardSprite path={spritePath} height={1.6} />
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
