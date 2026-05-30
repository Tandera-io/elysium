// apps/client/src/dialogue/DialogueManager.js
//
// Central registry for NPC dialogue configurations.
//
// Provides:
//   registerNPC(config)           — register a NPC's dialogue config at runtime
//   getGreetings(npcId)           — quick-reply greeting buttons
//   getTopics(npcId)              — topic groups with quick-reply buttons
//   getShopTriggerPhrases(npcId)  — phrases that open a shop modal
//   isShopTrigger(npcId, text)    — detect shop-open intent in a reply
//
// Also re-exports the full pipeline API so callers only need one import:
//   triggerDialogue, getActionResponse, getFirstMeetingLine,
//   getRepeatVisitLine, classifyContext, PLAYER_ACTIONS

import {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
} from './pipeline/index.js';

// ---------------------------------------------------------------------------
// NPC registry — maps npcId to its static dialogue definition.
// Each entry provides greetings, topics, and shop trigger phrases used by
// the UI to build quick-reply buttons before the player types free text.
// ---------------------------------------------------------------------------

/** @type {Map<string, Array<{ label: string, input: string }>>} */
const _greetings = new Map();

/** @type {Map<string, Record<string, Array<{ label: string, input: string }>>>} */
const _topics = new Map();

/** @type {Map<string, string[]>} */
const _shopTriggers = new Map();

/**
 * Register an NPC's static dialogue config so the manager can surface it.
 *
 * @param {{ npcId: string, greetings: any[], topics: Record<string, any[]>, shopTriggerPhrases: string[] }} config
 */
export function registerNPC(config) {
  _greetings.set(config.npcId, config.greetings ?? []);
  _topics.set(config.npcId, config.topics ?? {});
  _shopTriggers.set(config.npcId, config.shopTriggerPhrases ?? []);
}

/**
 * Returns quick-reply greeting buttons for an NPC.
 *
 * @param {string} npcId
 * @returns {Array<{ label: string, input: string }>}
 */
export function getGreetings(npcId) {
  return _greetings.get(npcId) ?? [];
}

/**
 * Returns topic groups with quick-reply buttons for an NPC.
 *
 * @param {string} npcId
 * @returns {Record<string, Array<{ label: string, input: string }>>}
 */
export function getTopics(npcId) {
  return _topics.get(npcId) ?? {};
}

/**
 * Returns shop-trigger phrases for an NPC (used to detect when the NPC
 * wants to open a shop modal).
 *
 * @param {string} npcId
 * @returns {string[]}
 */
export function getShopTriggerPhrases(npcId) {
  return _shopTriggers.get(npcId) ?? [];
}

/**
 * Check whether a reply text contains a shop-trigger phrase for the NPC.
 *
 * @param {string} npcId
 * @param {string} replyText
 * @returns {boolean}
 */
export function isShopTrigger(npcId, replyText) {
  const lower = replyText.toLowerCase();
  return getShopTriggerPhrases(npcId).some((phrase) => lower.includes(phrase));
}

// ---------------------------------------------------------------------------
// Re-export pipeline API so callers only import from DialogueManager.
// ---------------------------------------------------------------------------

export {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
};

// ---------------------------------------------------------------------------
// Auto-register built-in NPCs on module load.
// Ferraz lives in src/npc/NPCs/; Nina and Dorinha in src/features/npc/dialogue/.
// ---------------------------------------------------------------------------

import FERRAZ_DIALOGUE from '../npc/NPCs/Ferraz.js';

registerNPC(FERRAZ_DIALOGUE);
