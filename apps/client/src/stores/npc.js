/**
 * npc.js
 *
 * Standalone JS facade over the canonical TypeScript NPC and dialogue stores.
 * Reactive state lives in:
 *   src/systems/npc/npcStore.ts       — NPC definitions and world positions
 *   src/systems/dialogue/dialogueStore.ts — active dialogue state
 *
 * Usage (React):
 *   import { useNpcStore, useDialogueStore } from './stores/npc.js';
 *   const npcs = useNpcStore(s => s.npcs);
 *   const npcId = useDialogueStore(s => s.npcId);
 *
 * Usage (imperative):
 *   import { openDialogue, closeDialogue, sendMessage } from './stores/npc.js';
 *   openDialogue('ferraz');
 */

import { useNpcStore as _useNpcStore } from '../systems/npc/npcStore';
import { useDialogueStore as _useDialogueStore } from '../systems/dialogue/dialogueStore';

// -- Re-export canonical Zustand hooks ----------------------------------------
export { useNpcStore } from '../systems/npc/npcStore';
export { useDialogueStore } from '../systems/dialogue/dialogueStore';

// ---------------------------------------------------------------------------
// Imperative API
// ---------------------------------------------------------------------------

function _npc() {
  return _useNpcStore.getState();
}

function _dialogue() {
  return _useDialogueStore.getState();
}

/**
 * Get a single NPC entry by id. Returns undefined if not registered.
 * @param {string} id
 */
export function getNpc(id) {
  return _npc().npcs[id];
}

/**
 * Get all registered NPC entries.
 * @returns {Record<string, import('../systems/npc/npcStore').NpcStateEntry>}
 */
export function getAllNpcs() {
  return _npc().npcs;
}

/**
 * Update an NPC's live world position (e.g. from schedule logic).
 * @param {string} id
 * @param {{ x: number, z: number }} pos
 */
export function setNpcPosition(id, pos) {
  _npc().setPosition(id, pos);
}

/**
 * Open dialogue with an NPC, clearing any previous history.
 * @param {string} npcId
 */
export function openDialogue(npcId) {
  _dialogue().open(npcId);
}

/**
 * Close the active dialogue.
 */
export function closeDialogue() {
  _dialogue().close();
}

/**
 * Send a player message in the active dialogue.
 * @param {string} input
 * @param {{ hour: number, dayInSeason: number, season: string, year: number }} world
 * @returns {Promise<void>}
 */
export function sendMessage(input, world) {
  return _dialogue().send(input, world);
}

/**
 * Get the id of the NPC currently in dialogue, or null if none.
 * @returns {string | null}
 */
export function getActiveNpcId() {
  return _dialogue().npcId;
}

/**
 * Returns true if a dialogue is currently open.
 * @returns {boolean}
 */
export function isDialogueOpen() {
  return _dialogue().npcId !== null;
}
