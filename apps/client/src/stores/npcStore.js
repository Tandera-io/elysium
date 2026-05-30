// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/stores/npcStore.js
//
// NPC store — thin JS layer that re-exports the canonical TypeScript NPC store
// and surfaces dialogue-related helpers that components can import from a single
// path without needing TypeScript imports.
//
// Exposes:
//   useNpcStore        — re-exported Zustand store from systems/npc/npcStore.ts
//   useDialogueStore   — re-exported Zustand store from systems/dialogue/dialogueStore.ts
//   getNpcDialogue(id) — returns the quick-reply dialogue config for a given NPC id
//   NPC_IDS            — known NPC ids for type-safe references

export { useNpcStore } from '../systems/npc/npcStore';
export { useDialogueStore } from '../systems/dialogue/dialogueStore';

import { NINA_DIALOGUE } from '../features/npc/dialogue/nina';
import { DORINHA_DIALOGUE } from '../features/npc/dialogue/dorinha';

/** Known NPC identifiers. */
export const NPC_IDS = /** @type {const} */ ({
  NINA: 'nina',
  DORINHA: 'dorinha',
  MARINA: 'marina',
  BENTO: 'bento',
  LUCIA: 'lucia',
});

/** Map of npc id → static dialogue config (greetings + topic quick-replies). */
const DIALOGUE_CONFIGS = {
  nina: NINA_DIALOGUE,
  dorinha: DORINHA_DIALOGUE,
};

/**
 * Returns the static dialogue config (greetings + topic quick-replies) for the
 * given NPC id, or null if none is defined.
 *
 * @param {string} npcId
 * @returns {{ npcId: string, greetings: Array<{label:string,input:string}>, topics: Record<string,Array<{label:string,input:string}>>, shopTriggerPhrases: string[] } | null}
 */
export function getNpcDialogue(npcId) {
  return DIALOGUE_CONFIGS[npcId] ?? null;
}
