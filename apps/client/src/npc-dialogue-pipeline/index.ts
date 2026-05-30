import { findInteractTarget } from '../systems/npc/interaction';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import type { NpcStateEntry } from '../systems/npc/npcStore';

export { INTERACT_RANGE, findInteractTarget } from '../systems/npc/interaction';

export {
  PLAYER_ACTIONS,
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
} from '../dialogue/pipeline/index.js';

export { useDialogueStore } from '../systems/dialogue/dialogueStore';

export {
  registerNPC,
  getGreetings,
  getTopics,
  getShopTriggerPhrases,
  isShopTrigger,
} from '../dialogue/DialogueManager';

/** Opens dialogue with the nearest NPC in range. Returns npcId or null. */
export function triggerNpcDialogue(
  playerPos: { x: number; z: number },
  npcs: Record<string, NpcStateEntry>,
): string | null {
  const target = findInteractTarget(playerPos, npcs);
  if (!target) return null;
  useDialogueStore.getState().open(target.def.id);
  return target.def.id;
}

/** Returns true if any NPC is within interaction range. */
export function canInteract(
  playerPos: { x: number; z: number },
  npcs: Record<string, NpcStateEntry>,
): boolean {
  return findInteractTarget(playerPos, npcs) !== null;
}
