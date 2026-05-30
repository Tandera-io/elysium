/**
 * JS facade for the dialogue store.
 * Re-exports from the TypeScript implementation for use in plain JS files.
 */
import { useDialogueStore } from '../systems/dialogue/dialogueStore';

export { useDialogueStore };

/**
 * Open dialogue with an NPC. Automatically loads and shows the NPC's greeting.
 * @param {string} npcId
 */
export function openDialogue(npcId) {
  useDialogueStore.getState().open(npcId);
}

/**
 * Close the currently open dialogue.
 */
export function closeDialogue() {
  useDialogueStore.getState().close();
}

/**
 * Send a player message in the active dialogue.
 * @param {string} text
 * @param {{ hour: number, dayInSeason: number, season: string, year: number }} world
 * @returns {Promise<void>}
 */
export function sendMessage(text, world) {
  return useDialogueStore.getState().send(text, world);
}

/**
 * Load and display an NPC's greeting in the current dialogue.
 * @param {string} npcId
 */
export function greetNpc(npcId) {
  useDialogueStore.getState().greet(npcId);
}

/**
 * Check whether a dialogue is currently open.
 * @returns {boolean}
 */
export function isDialogueOpen() {
  return useDialogueStore.getState().npcId !== null;
}
