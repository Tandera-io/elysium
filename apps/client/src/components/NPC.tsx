/**
 * NPC — R3F component that drives random wandering movement for all NPCs.
 *
 * Mount inside <Canvas> alongside TimeAdvancer and NpcView so that
 * useFrame has access to the R3F render loop. No visual output; rendering
 * is handled by NpcView.
 */
import { useFrame } from '@react-three/fiber';
import { tickAllNpcs } from '../systems/npc/npcMovement';

/** Advance NPC wandering each frame. */
export function NPCMovement(): null {
  useFrame((_, delta) => {
    tickAllNpcs(delta);
  });
  return null;
}
