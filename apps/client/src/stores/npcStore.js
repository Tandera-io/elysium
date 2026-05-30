/**
 * npcStore.js
 *
 * Standalone JS facade over the canonical TypeScript NPC store.
 * All reactive state and persistence live in:
 *   src/systems/npc/npcStore.ts
 *
 * This file provides:
 *   1. A plain re-export of the Zustand hook and store for React components.
 *   2. An imperative API for non-React / legacy JS callers (Phaser scenes,
 *      scripts, etc.) that do not use hooks.
 *   3. Heart-level / interaction-count helpers that sit on top of the store
 *      and feed the dialogue pipeline's `classifyContext` function.
 *
 * All NPC definitions are loaded from JSON at module init inside the TS store;
 * this file does not duplicate that logic.
 *
 * Usage (React):
 *   import { useNpcStore } from './stores/npcStore.js';
 *   const npcs = useNpcStore(s => s.npcs);
 *
 * Usage (imperative):
 *   import { getNpc, setNpcPosition, getNpcContext } from './stores/npcStore.js';
 *   const marina = getNpc('marina');
 *   setNpcPosition('marina', { x: -8, z: -4 });
 *   const ctx = getNpcContext('marina'); // { interactionCount, heartLevel }
 */

import { useNpcStore as _useNpcStore } from '../systems/npc/npcStore';

// -- Re-export the canonical Zustand hook ------------------------------------
export { useNpcStore } from '../systems/npc/npcStore';

// ---------------------------------------------------------------------------
// Per-NPC interaction state
// Tracks how many times the player has talked to each NPC and their current
// heart level.  Stored in module-level memory (persists for the session).
// A future iteration should persist this to the save-game via IndexedDB.
// ---------------------------------------------------------------------------

/** @type {Map<string, { interactionCount: number, heartLevel: number }>} */
const _npcInteractionState = new Map();

/**
 * Get or create the mutable interaction record for an NPC.
 *
 * @param {string} npcId
 * @returns {{ interactionCount: number, heartLevel: number }}
 */
function _getInteractionRecord(npcId) {
  if (!_npcInteractionState.has(npcId)) {
    _npcInteractionState.set(npcId, { interactionCount: 0, heartLevel: 0 });
  }
  return /** @type {{ interactionCount: number, heartLevel: number }} */ (
    _npcInteractionState.get(npcId)
  );
}

// ---------------------------------------------------------------------------
// Imperative API
// ---------------------------------------------------------------------------

/**
 * Return the full NpcStateEntry (def + live worldPos) for a given NPC id, or
 * undefined if the NPC is not registered.
 *
 * @param {string} npcId
 * @returns {import('../systems/npc/npcStore').NpcStateEntry | undefined}
 */
export function getNpc(npcId) {
  return _store().npcs[npcId];
}

/**
 * Return all registered NPCs as a plain object keyed by NPC id.
 *
 * @returns {Record<string, import('../systems/npc/npcStore').NpcStateEntry>}
 */
export function getAllNpcs() {
  return _store().npcs;
}

/**
 * Update the live world-space position of an NPC.
 * Triggers any React components subscribed to the store.
 *
 * @param {string} npcId
 * @param {{ x: number, z: number }} pos
 */
export function setNpcPosition(npcId, pos) {
  _store().setPosition(npcId, pos);
}

// ---------------------------------------------------------------------------
// Heart-level & interaction-count helpers
// ---------------------------------------------------------------------------

/**
 * Return the dialogue context object expected by the pipeline's
 * `classifyContext` / `getActionResponse` functions.
 *
 * @param {string} npcId
 * @returns {{ interactionCount: number, heartLevel: number }}
 */
export function getNpcContext(npcId) {
  const rec = _getInteractionRecord(npcId);
  return { interactionCount: rec.interactionCount, heartLevel: rec.heartLevel };
}

/**
 * Increment the interaction count for an NPC by 1.
 * Call this each time the player successfully speaks to the NPC.
 *
 * @param {string} npcId
 */
export function recordInteraction(npcId) {
  const rec = _getInteractionRecord(npcId);
  rec.interactionCount += 1;
}

/**
 * Add heart points to an NPC.
 * Heart level is capped at 10 (matches the design spec).
 *
 * @param {string} npcId
 * @param {number} amount  - Points to add (use negative to subtract).
 */
export function addHeartPoints(npcId, amount) {
  const rec = _getInteractionRecord(npcId);
  rec.heartLevel = Math.max(0, Math.min(10, rec.heartLevel + amount));
}

/**
 * Directly set the heart level for an NPC.
 * Useful for save-game loading.
 *
 * @param {string} npcId
 * @param {number} level  - 0-10
 */
export function setHeartLevel(npcId, level) {
  const rec = _getInteractionRecord(npcId);
  rec.heartLevel = Math.max(0, Math.min(10, level));
}

/**
 * Directly set the interaction count for an NPC.
 * Useful for save-game loading.
 *
 * @param {string} npcId
 * @param {number} count
 */
export function setInteractionCount(npcId, count) {
  const rec = _getInteractionRecord(npcId);
  rec.interactionCount = Math.max(0, count);
}

/**
 * Export the full interaction-state snapshot for persistence.
 * Returns an array of `{ npcId, interactionCount, heartLevel }` entries.
 *
 * @returns {Array<{ npcId: string, interactionCount: number, heartLevel: number }>}
 */
export function exportInteractionState() {
  return Array.from(_npcInteractionState.entries()).map(([npcId, rec]) => ({
    npcId,
    interactionCount: rec.interactionCount,
    heartLevel: rec.heartLevel,
  }));
}

/**
 * Restore interaction state from a previously exported snapshot.
 *
 * @param {Array<{ npcId: string, interactionCount: number, heartLevel: number }>} snapshot
 */
export function importInteractionState(snapshot) {
  for (const entry of snapshot) {
    _npcInteractionState.set(entry.npcId, {
      interactionCount: entry.interactionCount,
      heartLevel: entry.heartLevel,
    });
  }
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

/**
 * Return the NPC's schedule array from its definition, or an empty array if
 * the NPC has no schedule.
 *
 * @param {string} npcId
 * @returns {import('@elysium/shared').NpcSchedule[]}
 */
export function getNpcSchedule(npcId) {
  const entry = getNpc(npcId);
  return entry?.def.schedule ?? [];
}

/**
 * Return the expected location of an NPC for a given game hour (0-23.99).
 * Walks the schedule entries and returns the location of the first matching
 * window, or null if no schedule entry covers the given time.
 *
 * Hours use a 24-hour float format consistent with `timeStore.hour`.
 *
 * @param {string} npcId
 * @param {number} gameHour  - Current in-game hour (e.g. 9.5 = 09:30)
 * @returns {string | null}  - Location key (e.g. 'padaria', 'praca') or null
 */
export function getNpcLocationAt(npcId, gameHour) {
  const schedule = getNpcSchedule(npcId);
  if (schedule.length === 0) return null;

  for (const entry of schedule) {
    const fromMins = _hhmmToMins(entry.from);
    const toMins = _hhmmToMins(entry.to);
    const nowMins = gameHour * 60;

    // Handle midnight-wrap schedules (e.g. 22:00 -> 02:00)
    if (fromMins <= toMins) {
      if (nowMins >= fromMins && nowMins < toMins) return entry.location;
    } else {
      if (nowMins >= fromMins || nowMins < toMins) return entry.location;
    }
  }

  return null;
}

// -- Internal helpers ---------------------------------------------------------

/** @param {string} hhmm e.g. "09:30" -> 570 */
function _hhmmToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function _store() {
  return _useNpcStore.getState();
}
