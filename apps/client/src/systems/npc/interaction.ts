import type { NpcStateEntry } from './npcStore';

export const INTERACT_RANGE = 2.5;

/**
 * Returns the nearest NPC within INTERACT_RANGE of the player, or null.
 */
export function findInteractTarget(
  playerPos: { x: number; z: number },
  npcs: Record<string, NpcStateEntry>,
): NpcStateEntry | null {
  let best: NpcStateEntry | null = null;
  let bestDist = INTERACT_RANGE;
  for (const entry of Object.values(npcs)) {
    const dx = entry.worldPos.x - playerPos.x;
    const dz = entry.worldPos.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d < bestDist) {
      best = entry;
      bestDist = d;
    }
  }
  return best;
}
