/**
 * Dorinha — seed-shop NPC component.
 *
 * Dorinha is a cheerful young Brazilian woman who runs the seed shop on the
 * farm. Her billboarded pixel-art sprite is registered in content/assets.ts
 * under the key `dorinha` and is automatically rendered by NpcView (which
 * iterates all entries in the npcStore).
 *
 * This module also exports a standalone <DorinhaSprite /> component for use
 * in close-up cutscenes, shop-UI anchoring, or any context where only
 * Dorinha needs to appear without the full NpcView loop.
 *
 * Sprite: sprites/cache/076b890491bbb273.png (1024×1024, transparent bg)
 * World position default: { x: 6, z: -8 } (near the farm seed-shop stall)
 */

// @ts-check — consumed by Vite JSX transform; no .tsx required.

import { Suspense } from 'react';
import { useNpcStore } from '../../systems/npc/npcStore';
import { SPRITES } from '../../content/assets';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';

const NPC_ID = 'dorinha';

/**
 * Green capsule placeholder shown while the sprite texture streams in.
 * Green tint distinguishes Dorinha from the default red used in NpcView.
 *
 * @returns {JSX.Element}
 */
function DorinhaCapsule() {
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#5a9e6e" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#3b1e08" />
      </mesh>
    </>
  );
}

/**
 * Standalone sprite for Dorinha.
 *
 * Reads `worldPos` from the npcStore so any future schedule or interaction
 * updates propagate automatically without touching this component.
 *
 * @returns {JSX.Element | null}
 */
export function DorinhaSprite() {
  const entry = useNpcStore((s) => s.npcs[NPC_ID]);
  const spritePath = SPRITES[NPC_ID];

  if (!entry) return null;

  const { worldPos } = entry;

  return (
    <group position={[worldPos.x, 0, worldPos.z]}>
      {spritePath ? (
        <Suspense fallback={<DorinhaCapsule />}>
          <BillboardSprite path={spritePath} height={1.6} />
        </Suspense>
      ) : (
        <DorinhaCapsule />
      )}
    </group>
  );
}

export default DorinhaSprite;
