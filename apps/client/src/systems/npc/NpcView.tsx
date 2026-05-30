import { Suspense, useCallback } from 'react';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';
import { useNpcStore } from './npcStore';
import { useDialogueStore } from '../dialogue/dialogueStore';
import { SPRITES, type SpriteSlot } from '../../content/assets';
import { usePlayerStore } from '../../store/playerStore';
import { INTERACT_RANGE } from './interaction';

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

interface NpcGroupProps {
  npcId: string;
  worldPos: { x: number; z: number };
  spritePath: string | null;
}

/** A single NPC in the world. Handles click-to-interact in addition to E-key. */
function NpcGroup({ npcId, worldPos, spritePath }: NpcGroupProps) {
  const handleClick = useCallback(() => {
    // Only open dialogue if the player is close enough (same range as E-key).
    const playerPos = usePlayerStore.getState().position;
    const dx = worldPos.x - playerPos.x;
    const dz = worldPos.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > INTERACT_RANGE) return;

    const dialogueState = useDialogueStore.getState();
    if (dialogueState.npcId) return; // dialogue already open
    dialogueState.open(npcId);
  }, [npcId, worldPos]);

  return (
    <group
      position={[worldPos.x, 0, worldPos.z]}
      onClick={handleClick}
      // Widen the pointer hit area slightly so clicking is forgiving
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {spritePath ? (
        <Suspense fallback={<NpcCapsuleFallback />}>
          <BillboardSprite path={spritePath} height={1.6} />
        </Suspense>
      ) : (
        <NpcCapsuleFallback />
      )}
      {/* Invisible collision cylinder for reliable click detection */}
      <mesh visible={false}>
        <cylinderGeometry args={[0.4, 0.4, 1.8, 8]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

/** Renders each NPC as a billboarded sprite if a sprite is registered for them. */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        const spritePath = spriteFor(def.id);
        return <NpcGroup key={def.id} npcId={def.id} worldPos={worldPos} spritePath={spritePath} />;
      })}
    </group>
  );
}
