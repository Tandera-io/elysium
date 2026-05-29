/**
 * Npc.jsx — Animated NPC rendering component.
 *
 * Provides NpcSprite (per-NPC animated sprite) and AnimatedNpcView (drop-in
 * replacement for NpcView that adds walk animation support via WALK_CYCLES).
 *
 * Walk animations follow the same pattern as PlayerController: SpriteAnimator
 * is used when the NPC has a WALK_CYCLES entry; otherwise falls back to a
 * static BillboardSprite. The `moving` prop drives animation playback.
 *
 * Dorinha's walk frames are sourced from WALK_CYCLES.dorinha in assets.ts and
 * described structurally in src/assets/walkAnimations/dorinha.json.
 */

import { Suspense } from 'react';
import { BillboardSprite } from '../engine/loader/BillboardSprite';
import { SpriteAnimator } from '../engine/loader/SpriteAnimator';
import { useNpcStore } from '../systems/npc/npcStore';
import { SPRITES, WALK_CYCLES } from '../content/assets';

/** Red capsule fallback shown while sprite textures stream in. */
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

/**
 * Renders one NPC's sprite.
 *
 * - If the NPC has a WALK_CYCLES entry with more than one frame, uses
 *   SpriteAnimator and toggles playback via the `moving` prop.
 * - Otherwise falls back to a static BillboardSprite.
 *
 * @param {{ npcId: string, moving?: boolean }} props
 */
export function NpcSprite({ npcId, moving = false }) {
  const cycle = WALK_CYCLES[npcId];
  const staticPath = SPRITES[npcId] ?? null;

  if (cycle && cycle.length > 1) {
    return <SpriteAnimator frames={cycle} fps={6} playing={moving} height={1.6} />;
  }

  if (staticPath) {
    return <BillboardSprite path={staticPath} height={1.6} />;
  }

  // No sprite registered — caller should show NpcCapsuleFallback.
  return null;
}

/**
 * Drop-in replacement for NpcView that renders all NPCs with walk animation
 * support. NPCs with a WALK_CYCLES entry (e.g. dorinha) will animate when
 * their `moving` state is true. Stationary NPCs remain on their idle frame.
 *
 * Currently NPCs have no server-driven movement, so `moving` defaults to
 * false for all. Wire up npcStore.moving (Phase 11+) to enable live animation.
 */
export function AnimatedNpcView() {
  const npcs = useNpcStore((s) => s.npcs);

  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => {
        // Future: read moving flag from store when NPC schedules drive movement.
        const moving = false;

        return (
          <group key={def.id} position={[worldPos.x, 0, worldPos.z]}>
            <Suspense fallback={<NpcCapsuleFallback />}>
              <NpcSprite npcId={def.id} moving={moving} />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
