/**
 * stores/npc.js — Zustand store for active NPC dialogue UI state.
 *
 * This store manages which NPC is currently being spoken to and the quick-reply
 * chip state (open topic, available choices). It sits on top of:
 *   - systems/npc/npcStore.ts  — world-space NPC definitions & positions
 *   - systems/dialogue/dialogueStore.ts — chat history & API calls
 *   - stores/gameState.js — heart levels & world time
 *
 * The NPCDialogue component reads from this store to render the dialogue UI.
 */

import { create } from 'zustand';

/**
 * @typedef {{ label: string, input: string }} QuickReply
 */

/**
 * @typedef {Object} NpcDialogueUIState
 * @property {string | null} activeNpcId - ID of the NPC currently in dialogue.
 * @property {QuickReply[]} greetings - Current greeting chips to show.
 * @property {Record<string, QuickReply[]>} topics - Topic groups available.
 * @property {string | null} openTopicKey - Which topic group is expanded.
 * @property {boolean} showQuickReplies - Whether the chip bar is visible.
 */

/**
 * @typedef {Object} NpcDialogueUIActions
 * @property {(npcId: string, greetings: QuickReply[], topics: Record<string, QuickReply[]>) => void} openDialogue
 * @property {() => void} closeDialogue
 * @property {(key: string | null) => void} setOpenTopic
 * @property {() => void} toggleQuickReplies
 */

export const useNpcDialogueStore = create((set, get) => ({
  // ─── State ─────────────────────────────────────────────────────────────────

  /** ID of the NPC currently in dialogue, or null when no dialogue is open. */
  activeNpcId: null,

  /** Greeting chips to display in the bottom chip bar. */
  greetings: [],

  /**
   * Topic groups available for this NPC.
   * Keys are topic category IDs (e.g. "general", "upgrades").
   * Values are arrays of { label, input } quick-reply objects.
   */
  topics: {},

  /** Which topic group is currently expanded to show sub-chips, or null. */
  openTopicKey: null,

  /** Whether the quick-reply chip bar is shown. Hides during NPC text animation. */
  showQuickReplies: true,

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Opens dialogue with an NPC and loads its greeting/topic chips.
   *
   * @param {string} npcId
   * @param {QuickReply[]} greetings
   * @param {Record<string, QuickReply[]>} topics
   */
  openDialogue(npcId, greetings, topics) {
    set({
      activeNpcId: npcId,
      greetings: greetings ?? [],
      topics: topics ?? {},
      openTopicKey: null,
      showQuickReplies: true,
    });
  },

  /**
   * Closes the dialogue and resets all chip state.
   */
  closeDialogue() {
    set({
      activeNpcId: null,
      greetings: [],
      topics: {},
      openTopicKey: null,
      showQuickReplies: true,
    });
  },

  /**
   * Expands a topic group. Pass null to collapse all.
   *
   * @param {string | null} key
   */
  setOpenTopic(key) {
    // Toggle: clicking the already-open topic collapses it.
    const current = get().openTopicKey;
    set({ openTopicKey: current === key ? null : key });
  },

  /**
   * Toggles the quick-reply chip bar visibility.
   * Useful when an NPC dialogue line is animating.
   */
  toggleQuickReplies() {
    set((s) => ({ showQuickReplies: !s.showQuickReplies }));
  },
}));

// Expose in dev for debugging.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__npcDialogueStore = useNpcDialogueStore;
}
