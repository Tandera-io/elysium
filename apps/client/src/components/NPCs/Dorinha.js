/**
 * Dorinha NPC component — quitandeira do vilarejo.
 *
 * Wires the Dorinha NPC definition with the choice-based dialogue system,
 * daily schedule, and proximity interaction trigger. Import this module
 * wherever Dorinha's identity, position, or dialogue tree is needed.
 *
 * Dialogue is handled by useChoiceDialogueStore (stores/dialogueStore.ts).
 * The tree itself lives in dialogue/DorinhaDialogue.json and is loaded by
 * DialogueBox.tsx when the player opens dialogue with Dorinha.
 */

import dorinhaTree from '../../dialogue/DorinhaDialogue.json';

/** Unique NPC identifier — matches npcStore key and content/npcs/dorinha.json. */
export const DORINHA_ID = 'dorinha';

/**
 * Named world-space (x, z) positions Dorinha visits during the day.
 * Coordinates match the tile grid in WorldGrid.ts.
 */
export const DORINHA_LOCATIONS = {
  /** Her produce stall / shop counter */
  loja_sementes: { x: 6, z: 4 },
  /** Her home at the edge of the village */
  casa_dorinha: { x: 10, z: 8 },
  /** The village square for socialising */
  praca: { x: 0, z: 0 },
};

/**
 * Daily schedule — 6 time windows covering 06:00–22:00.
 * Each entry maps an integer hour range to a location key and activity string.
 */
export const DORINHA_SCHEDULE = [
  { from: 6, to: 7, location: 'casa_dorinha', activity: 'acordando e tomando café' },
  { from: 7, to: 12, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 12, to: 14, location: 'casa_dorinha', activity: 'almoçando' },
  { from: 14, to: 18, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 18, to: 20, location: 'praca', activity: 'relaxando na praça' },
  { from: 20, to: 22, location: 'casa_dorinha', activity: 'descansando em casa' },
];

/**
 * Returns Dorinha's world-space target position for the given hour (0–23).
 * Falls back to her home for hours outside scheduled windows.
 * @param {number} hour - Current in-game hour (integer 0–23).
 * @returns {{ x: number; z: number }}
 */
export function getDorinaTargetPosition(hour) {
  const entry = DORINHA_SCHEDULE.find((s) => hour >= s.from && hour < s.to);
  const locationKey = entry ? entry.location : 'casa_dorinha';
  return DORINHA_LOCATIONS[locationKey];
}

/**
 * Returns a human-readable activity string for the current in-game hour.
 * @param {number} hour - Current in-game hour (integer 0–23).
 * @returns {string}
 */
export function getDorinaCurrentActivity(hour) {
  const entry = DORINHA_SCHEDULE.find((s) => hour >= s.from && hour < s.to);
  return entry ? entry.activity : 'dormindo';
}

/**
 * Walk animation sprite frame paths (idle → left step → idle → right step).
 * Must match the cache paths registered in content/assets.ts WALK_CYCLES.dorinha.
 */
export const DORINHA_WALK_FRAMES = [
  'sprites/cache/7ca40c4410ad1460.png', // idle  (frame 0)
  'sprites/cache/c2daeecd8b188ac4.png', // walk  (frame 1)
  'sprites/cache/7ca40c4410ad1460.png', // idle  (frame 2, sandwich)
  'sprites/cache/c2daeecd8b188ac4.png', // walk  (frame 3)
];

/** Animation playback rate for Dorinha's walk cycle (frames per second). */
export const DORINHA_WALK_FPS = 6;

/**
 * Dialogue tree for Dorinha, conforming to the DialogueTree shape used by
 * useChoiceDialogueStore (stores/dialogueStore.ts).
 *
 * Structure:
 *   entry  — key of the first node shown when dialogue opens
 *   nodes  — map of node key → { text, choices: [{ id, text, next }] }
 *
 * `next === null` closes the dialogue when the player picks that choice.
 * DialogueBox.tsx calls useChoiceDialogueStore.open(DORINHA_ID, DORINHA_DIALOGUE_TREE)
 * automatically whenever the player triggers interaction with Dorinha.
 */
export const DORINHA_DIALOGUE_TREE = dorinhaTree;
