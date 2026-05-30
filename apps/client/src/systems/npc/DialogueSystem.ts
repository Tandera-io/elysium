/**
 * Re-exports the client-side DialogueSystem from its canonical location.
 * The task specification references src/npc/DialogueSystem — this module
 * satisfies that contract while keeping the implementation in systems/dialogue/.
 */
export {
  getTimeOfDay,
  getGreeting,
  getDialoguesForTime,
  getInteractionCount,
  incrementInteractionCount,
  getKnownNpcIds,
} from '../dialogue/DialogueSystem';
export type { TimeOfDay, DialogueLine } from '../dialogue/DialogueSystem';
