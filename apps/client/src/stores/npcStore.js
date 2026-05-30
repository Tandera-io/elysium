// apps/client/src/stores/npcStore.js
//
// NPC action-dialogue store — tracks when NPCs comment on player actions.
//
// Separate from dialogueStore (which handles full AI conversations).
// This store drives the NPCDialog component: short, auto-dismissing NPC
// reactions to farm actions (harvest, plant, water, sell, etc.).
//
// Usage:
//   import { useNpcActionStore, notifyNpcAction } from '../stores/npcStore';
//
//   // In a game system:
//   notifyNpcAction('dorinha', PLAYER_ACTIONS.HARVEST, { interactionCount: 3 });
//
//   // In NPCDialog:
//   const { npcId, message, dismiss } = useNpcActionStore();

import { create } from 'zustand';
import { triggerDialogue, PLAYER_ACTIONS } from '../dialogue/pipeline/index';

export { PLAYER_ACTIONS };

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * useNpcActionStore — ephemeral action-triggered NPC comment state.
 *
 * State:
 *   npcId   : string | null  — NPC who is speaking (null = silent)
 *   message : string         — the line to display
 *   action  : string | null  — which action triggered this
 *
 * Actions:
 *   trigger(npcId, playerAction, context?) — pick a response and show it
 *   dismiss()                              — clear the current message
 */
export const useNpcActionStore = create((set) => ({
  npcId: null,
  message: '',
  action: null,

  trigger: (npcId, playerAction, context = {}) => {
    const lines = triggerDialogue(npcId, playerAction, context);
    if (!lines.length) return;
    set({ npcId, message: lines[0], action: playerAction });
  },

  dismiss: () => set({ npcId: null, message: '', action: null }),
}));

// ---------------------------------------------------------------------------
// Imperative helper (for use outside React — e.g. Phaser scenes, game systems)
// ---------------------------------------------------------------------------

/**
 * Trigger an NPC action comment imperatively from outside React.
 *
 * @param {string} npcId
 * @param {string} playerAction  — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number }} [context]
 */
export function notifyNpcAction(npcId, playerAction, context = {}) {
  useNpcActionStore.getState().trigger(npcId, playerAction, context);
}
