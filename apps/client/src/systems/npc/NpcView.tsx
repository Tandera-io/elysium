import { Suspense } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { SpriteAnimator } from '../../engine/loader/SpriteAnimator';
import { DorinhaSprite } from '../../npc/Dorinha';
import { useNpcStore } from './npcStore';
import { SPRITES, WALK_CYCLES, type SpriteSlot } from '../../content/assets';

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
  return WALK_CYCLES[key] ?? null;
}

interface NpcSpriteProps {
  npcId: string;
  moving: boolean;
}

function NpcSprite({ npcId, moving }: NpcSpriteProps) {
  if (npcId === 'dorinha') {
    return <DorinhaSprite moving={moving} />;
  }

  const spritePath = spriteFor(npcId);
  if (!spritePath) return <NpcCapsuleFallback />;

  const cycle = walkCycleFor(npcId);
  if (cycle && cycle.length > 1) {
    return (
      <Suspense fallback={<NpcCapsuleFallback />}>
        <SpriteAnimator frames={cycle} fps={6} playing={moving} height={1.6} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<NpcCapsuleFallback />}>
      <BillboardSprite path={spritePath} height={1.6} />
    </Suspense>
  );
}

/** Renders each NPC as a billboarded sprite with walking / idle animation. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  const movingNpcs = useNpcStore((s) => s.movingNpcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => (
        <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
          <NpcSprite npcId={def.id} moving={movingNpcs[def.id] ?? false} />
        </group>
      ))}
    </group>
  );
}
