import { Suspense } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { useNpcStore } from './npcStore';
import { SPRITES, type SpriteSlot } from '../../content/assets';
import { useTimeStore } from '../time/timeStore';
import { isNpcScheduleActive } from '../../gameLogic/time';

const NIGHT_OPACITY = 0.25;

function NpcCapsuleFallback({ opacity = 1 }: { opacity?: number }) {
  const color = opacity < 1 ? '#6a2a2a' : '#d35a5a';
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={opacity} />
      </mesh>
    </>
  );
}

function spriteFor(npcId: string): string | null {
  const key = npcId as SpriteSlot;
  return SPRITES[key] ?? null;
}

/** Renders each NPC as a billboarded sprite. Dims NPCs that are sleeping (off-schedule). */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);

  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        const active = isNpcScheduleActive(def.schedule, hour);
        const opacity = active ? 1 : NIGHT_OPACITY;
        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
            {spritePath ? (
              <Suspense fallback={<NpcCapsuleFallback opacity={opacity} />}>
                <BillboardSprite path={spritePath} height={1.6} opacity={opacity} />
              </Suspense>
            ) : (
              <NpcCapsuleFallback opacity={opacity} />
            )}
          </group>
        );
      })}
    </group>
  );
}
