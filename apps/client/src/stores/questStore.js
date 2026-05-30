// apps/client/src/stores/questStore.js
//
// Quest store facade — re-exports the canonical TypeScript quest store,
// provides hand-authored starter quest definitions available from day 1,
// and adds imperative helpers that Phaser scenes and non-React code can call
// without importing TypeScript modules directly.
//
// Exported surface:
//   useQuestStore             — Zustand store (re-exported from systems/quest/questStore)
//   STARTER_QUESTS            — array of hand-authored day-1 Quest definitions
//   getStarterQuestFor(id)    — starter quest for a given npcId, or null
//   acceptQuest(quest)        — accept a quest offered by an NPC
//   turnInQuest(questId)      — complete a quest and collect reward
//   getActiveQuestForNpc(id)  — return the active quest for an NPC, or null
//   getQuestSummary()         — plain object snapshot for HUD use

import { useQuestStore } from '../systems/quest/questStore';

export { useQuestStore };

// ---------------------------------------------------------------------------
// Hand-authored starter quest definitions
//
// These quests are always available from day 1 and do not require the
// economy simulation to generate them.  They use EconomyItemId values so
// they map cleanly onto QuestPanel, DialogueBox, and QuestUI components.
//
// Each entry matches the Quest interface from systems/quest/questDefs.ts:
//   { id, giverNpcId, item, quantity, rewardCash, rewardReputation,
//     status, createdOnDay }
// ---------------------------------------------------------------------------

/** @type {import('../systems/quest/questDefs').Quest[]} */
export const STARTER_QUESTS = [
  // Nina (ferramenteira) wants wheat to test a new tool-care technique.
  {
    id: 'starter-nina-trigo',
    giverNpcId: 'nina',
    item: 'trigo',
    quantity: 3,
    rewardCash: 40,
    rewardReputation: 2,
    status: 'available',
    createdOnDay: 1,
  },
  // Dorinha (quitandeira) needs tomatoes to restock her stall for the week.
  {
    id: 'starter-dorinha-tomate',
    giverNpcId: 'dorinha',
    item: 'tomate',
    quantity: 4,
    rewardCash: 35,
    rewardReputation: 2,
    status: 'available',
    createdOnDay: 1,
  },
  // Marina (padeira) needs extra wheat to bake the week's pão francês.
  {
    id: 'starter-marina-trigo',
    giverNpcId: 'marina',
    item: 'trigo',
    quantity: 5,
    rewardCash: 50,
    rewardReputation: 3,
    status: 'available',
    createdOnDay: 1,
  },
  // Bento (fazendeiro) needs tomatoes for a stew he is making.
  {
    id: 'starter-bento-tomate',
    giverNpcId: 'bento',
    item: 'tomate',
    quantity: 3,
    rewardCash: 30,
    rewardReputation: 2,
    status: 'available',
    createdOnDay: 1,
  },
];

/**
 * Return the starter quest for a specific NPC, or null if none is defined.
 *
 * @param {string} npcId
 * @returns {import('../systems/quest/questDefs').Quest | null}
 */
export function getStarterQuestFor(npcId) {
  return STARTER_QUESTS.find((q) => q.giverNpcId === npcId) ?? null;
}

// ---------------------------------------------------------------------------
// Imperative helpers (usable outside React — e.g. Phaser scenes, NPC scripts)
// ---------------------------------------------------------------------------

/**
 * Accept a quest offered by an NPC.
 * Safe to call even if the player already has a quest from this NPC;
 * the store de-dupes by id.
 *
 * @param {import('../systems/quest/questDefs').Quest} quest
 */
export function acceptQuest(quest) {
  useQuestStore.getState().accept(quest);
}

/**
 * Finalize a quest: pays reward cash, bumps reputation, moves to completed.
 * Returns the completed quest object, or null if not found.
 *
 * @param {string} questId
 * @returns {import('../systems/quest/questDefs').Quest | null}
 */
export function turnInQuest(questId) {
  return useQuestStore.getState().turnIn(questId);
}

/**
 * Returns the active quest for the given NPC, or null if none.
 *
 * @param {string} npcId
 * @returns {import('../systems/quest/questDefs').Quest | null}
 */
export function getActiveQuestForNpc(npcId) {
  return useQuestStore.getState().hasActiveFromNpc(npcId);
}

/**
 * Returns a lightweight snapshot of quest state for use in HUD overlays.
 *
 * @returns {{ cash: number, activeCount: number, completedCount: number }}
 */
export function getQuestSummary() {
  const s = useQuestStore.getState();
  return {
    cash: s.cash,
    activeCount: Object.keys(s.active).length,
    completedCount: s.completed.length,
  };
}
