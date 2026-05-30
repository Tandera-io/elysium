/**
 * NPC dialogue pipeline — quest-aware layer on top of the base pipeline.
 *
 * Imports hand-authored dialogue trees for each NPC and exposes:
 *  - Quest state management (offer / accept / complete)
 *  - Info-line retrieval
 *  - Quest requirement checking
 *
 * The base action-response pipeline lives at ../dialogue/pipeline/index.ts
 * and handles first-meeting / repeat-visit / action lines. This module adds
 * the structured quest layer on top of that.
 */

import marinaDialogue from '../assets/sprites/dialogues/marina.json';
import bentoDialogue from '../assets/sprites/dialogues/bento.json';
import luciaDialogue from '../assets/sprites/dialogues/lucia.json';
import ferrazDialogue from '../assets/sprites/dialogues/ferraz.json';

/** @type {Record<string, typeof marinaDialogue>} */
const DIALOGUE_TREES = {
  marina: marinaDialogue,
  bento: bentoDialogue,
  lucia: luciaDialogue,
  ferraz: ferrazDialogue,
};

const STORAGE_KEY = 'elysium_quest_state';

/**
 * @typedef {'available' | 'active' | 'completed'} QuestStatus
 *
 * @typedef {{ questId: string; npcId: string; status: QuestStatus; acceptedAt?: number; completedAt?: number }} QuestEntry
 */

/** @returns {Record<string, QuestEntry>} */
function loadQuestState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? /** @type {Record<string, QuestEntry>} */ (JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, QuestEntry>} state */
function saveQuestState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

let _questState = loadQuestState();

/**
 * Get a quest definition by NPC and quest ID.
 *
 * @param {string} npcId
 * @param {string} questId
 */
function getQuestDef(npcId, questId) {
  const tree = DIALOGUE_TREES[npcId];
  return tree?.quests.find((q) => q.id === questId) ?? null;
}

/**
 * Return the current status of a quest (default: 'available').
 *
 * @param {string} questId
 * @returns {QuestStatus}
 */
export function getQuestStatus(questId) {
  return _questState[questId]?.status ?? 'available';
}

/**
 * Return all quests for an NPC, each decorated with its current status.
 *
 * @param {string} npcId
 */
export function getQuestsForNpc(npcId) {
  const tree = DIALOGUE_TREES[npcId];
  if (!tree) return [];
  return tree.quests.map((q) => ({
    ...q,
    status: getQuestStatus(q.id),
  }));
}

/**
 * Get the dialogue text appropriate for the current state of a quest.
 *
 * @param {string} npcId
 * @param {string} questId
 * @returns {string | null}
 */
export function getQuestDialogue(npcId, questId) {
  const def = getQuestDef(npcId, questId);
  if (!def) return null;
  const status = getQuestStatus(questId);
  if (status === 'available') return def.offerDialogue;
  if (status === 'active') return def.pendingDialogue;
  if (status === 'completed') return def.completeDialogue;
  return def.offerDialogue;
}

/**
 * Mark a quest as accepted by the player.
 *
 * @param {string} npcId
 * @param {string} questId
 * @returns {string | null} The NPC's accept dialogue, or null if quest not found.
 */
export function acceptQuest(npcId, questId) {
  const def = getQuestDef(npcId, questId);
  if (!def) return null;
  _questState = {
    ..._questState,
    [questId]: { questId, npcId, status: 'active', acceptedAt: Date.now() },
  };
  saveQuestState(_questState);
  return def.acceptDialogue;
}

/**
 * Check whether the player's inventory satisfies a quest's requirements.
 *
 * @param {string} questId
 * @param {Record<string, number>} inventory  Map of itemId → quantity held.
 * @returns {boolean}
 */
export function checkQuestRequirements(questId, inventory) {
  const entry = _questState[questId];
  if (!entry || entry.status !== 'active') return false;
  const def = getQuestDef(entry.npcId, questId);
  if (!def) return false;
  return def.requirements.items.every((req) => (inventory[req.id] ?? 0) >= req.quantity);
}

/**
 * Complete a quest and return its rewards.
 * Caller is responsible for applying the rewards to game state.
 *
 * @param {string} questId
 * @returns {{ dialogue: string; rewards: typeof marinaDialogue['quests'][0]['rewards'] } | null}
 */
export function completeQuest(questId) {
  const entry = _questState[questId];
  if (!entry || entry.status !== 'active') return null;
  const def = getQuestDef(entry.npcId, questId);
  if (!def) return null;
  _questState = {
    ..._questState,
    [questId]: { ...entry, status: 'completed', completedAt: Date.now() },
  };
  saveQuestState(_questState);
  return { dialogue: def.completeDialogue, rewards: def.rewards };
}

/**
 * Return a random info line for an NPC.
 *
 * @param {string} npcId
 * @returns {string | null}
 */
export function getRandomInfoLine(npcId) {
  const tree = DIALOGUE_TREES[npcId];
  if (!tree || tree.infoLines.length === 0) return null;
  const idx = Math.floor(Math.random() * tree.infoLines.length);
  return tree.infoLines[idx] ?? null;
}

/**
 * Return all available NPC IDs that have dialogue trees loaded.
 *
 * @returns {string[]}
 */
export function getAvailableNpcIds() {
  return Object.keys(DIALOGUE_TREES);
}

/**
 * Reset all quest state (for testing or new-game scenarios).
 */
export function resetQuestState() {
  _questState = {};
  saveQuestState(_questState);
}
