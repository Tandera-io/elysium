import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { useNpcStore } from './npcStore';
import { SPRITES, type SpriteSlot } from '../../content/assets';
import { useTimeStore } from '../time/timeStore';
import { DORINHA_ID, DORINHA_SCHEDULE, type ScheduleSlot } from '../../npc/Dorinha';

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

const NPC_WALK_SPEED = 1.5; // world-units per second

/** Moves Dorinha toward her current schedule waypoint each frame. */
function DorinhaWalker() {
  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.1);
    const hour = useTimeStore.getState().hour;
    const slot = DORINHA_SCHEDULE.find((s: ScheduleSlot) => hour >= s.fromHour && hour < s.toHour);
    if (!slot) return;
    const store = useNpcStore.getState();
    const entry = store.npcs[DORINHA_ID];
    if (!entry) return;
    const { x, z } = entry.worldPos;
    const { x: tx, z: tz } = slot.pos;
    const dx = tx - x;
    const dz = tz - z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;
    const step = Math.min(NPC_WALK_SPEED * delta, dist);
    store.setPosition(DORINHA_ID, {
      x: x + (dx / dist) * step,
      z: z + (dz / dist) * step,
    });
  });
  return null;
}

/** Renders each NPC as a billboarded sprite if a sprite is registered for them. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      <DorinhaWalker />
      {Object.values(npcs).map(({ def, worldPos }) => {
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
