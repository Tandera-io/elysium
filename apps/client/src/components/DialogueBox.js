/**
 * DialogueBox.js
 *
 * Standalone JS re-export of the dialogue UI for contexts that cannot import
 * the TypeScript source directly (e.g. legacy Phaser scenes, plain-JS test
 * harnesses). All runtime logic lives in the canonical TSX component; this
 * file is a thin re-export + convenience facade.
 *
 * For the primary TypeScript component see:
 *   src/ui/DialogueBox.tsx
 *
 * Usage (React):
 *   import { DialogueBox } from './components/DialogueBox.js';
 *   // Mount once at the app root — it self-hides when no NPC dialogue is active.
 *
 * Programmatic API (imperative, no React needed):
 *   import { openDialogue, closeDialogue, sendMessage } from './components/DialogueBox.js';
 *   openDialogue('marina');
 *   await sendMessage('Oi, Marina! Como vai?', { hour: 9, dayInSeason: 3, season: 'Primavera', year: 1 });
 *   closeDialogue();
 */

import { useDialogueStore as _useDialogueStore } from '../systems/dialogue/dialogueStore';
import {
  getGreetings as _getGreetings,
  getTopics as _getTopics,
} from '../dialogue/DialogueManager';

// -- Re-export the canonical React component ----------------------------------
export { DialogueBox } from '../ui/DialogueBox';

// -- Re-export the Zustand store so callers can subscribe reactively ----------
export { useDialogueStore } from '../systems/dialogue/dialogueStore';

// -- Imperative facade (useful for Phaser scenes / plain JS) ------------------

/**
 * Open dialogue with the given NPC.
 * Clears history and focuses the dialogue window.
 *
 * @param {string} npcId  - NPC identifier (e.g. 'marina', 'nina', 'ferraz')
 */
export function openDialogue(npcId) {
  const { open } = _getStore();
  open(npcId);
}

/**
 * Close the currently open dialogue and reset all state.
 */
export function closeDialogue() {
  const { close } = _getStore();
  close();
}

/**
 * Send a player message to the active NPC and await the NPC reply.
 * Returns a Promise that resolves with the full updated history array once
 * the server responds (or rejects on network/LLM error).
 *
 * @param {string} playerInput          - The text the player typed / clicked
 * @param {{ hour: number, dayInSeason: number, season: string, year: number }} worldContext
 * @returns {Promise<import('../systems/dialogue/dialogueStore').DialogueTurn[]>}
 */
export async function sendMessage(playerInput, worldContext) {
  const store = _getStore();
  await store.send(playerInput, worldContext);
  return _getStore().history;
}

/**
 * Return true if a dialogue session is currently open.
 *
 * @returns {boolean}
 */
export function isDialogueOpen() {
  return _getStore().npcId !== null;
}

/**
 * Return the NPC id for the currently open dialogue, or null.
 *
 * @returns {string | null}
 */
export function getActiveNpcId() {
  return _getStore().npcId;
}

/**
 * Subscribe to dialogue state changes.
 * Mirrors the Zustand subscribe API: returns an unsubscribe function.
 *
 * @param {(state: import('../systems/dialogue/dialogueStore').DialogueState) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeToDialogue(listener) {
  return _useDialogueStore.subscribe(listener);
}

// -- Quick-reply helpers -------------------------------------------------------

/**
 * Return the registered greeting chips for an NPC.
 * Chips are shaped `{ label: string, input: string }`.
 *
 * @param {string} npcId
 * @returns {{ label: string, input: string }[]}
 */
export function getGreetingChips(npcId) {
  return _getGreetings(npcId);
}

/**
 * Return the registered topic groups for an NPC.
 * Shape: `Record<string, { label: string, input: string }[]>`
 *
 * @param {string} npcId
 * @returns {Record<string, { label: string, input: string }[]>}
 */
export function getTopicChips(npcId) {
  return _getTopics(npcId);
}

// -- Internal helper ----------------------------------------------------------

function _getStore() {
  return _useDialogueStore.getState();
}
