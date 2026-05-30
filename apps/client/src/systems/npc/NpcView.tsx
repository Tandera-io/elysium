import { Suspense } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { useNpcStore } from './npcStore';
import { SPRITES, type SpriteSlot } from '../../content/assets';
import { isNpcAsleep } from '../environment/EnvironmentSystem';
import { useTimeStore } from '../time/timeStore';

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

/** Renders each NPC as a billboarded sprite if a sprite is registered for them. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const sleeping = isNpcAsleep(hour);

  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        // NPCs are invisible (home/asleep) after NPC_SLEEP_HOUR and before NPC_WAKE_HOUR.
        // They are rendered at reduced opacity/scale during night to hint at reduced activity.
        const nightScale = sleeping ? 0.0 : 1.0;
        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]} scale={nightScale}>
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
