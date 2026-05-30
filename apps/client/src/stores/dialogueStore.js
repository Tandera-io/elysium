/**
 * stores/dialogueStore.js — Zustand store for dialogue node/choice state.
 *
 * This is the JS-layer dialogue store for the DialogueBox component.  It sits
 * on top of the TypeScript systems/dialogue/dialogueStore (which owns chat
 * history and API calls) and adds:
 *
 *   - A named "current node" concept for branching dialogue trees
 *   - Discrete choice arrays (response option buttons)
 *   - Open / close lifecycle independent of which NPC system triggers it
 *
 * Usage from game code:
 *   import { useDialogueBoxStore } from '../stores/dialogueStore.js';
 *   useDialogueBoxStore.getState().openNode(npcId, nodeId, choices);
 *
 * The DialogueBox component reads from this store.  When choices are empty the
 * component falls back to a free-text input instead of rendering option buttons.
 */

import { create } from 'zustand';

/**
 * @typedef {{ id: string, label: string, next: string | null }} DialogueChoice
 */

/**
 * @typedef {Object} DialogueBoxState
 * @property {string | null} npcId       - ID of the NPC currently shown.
 * @property {string | null} nodeId      - Current dialogue-tree node ID.
 * @property {string}        text        - NPC line shown in the box.
 * @property {DialogueChoice[]} choices  - Response option buttons to render.
 * @property {boolean}       open        - Whether the box is visible.
 * @property {boolean}       pending     - True while waiting for a reply.
 * @property {string | null} error       - Last error message, if any.
 */

/**
 * @typedef {Object} DialogueBoxActions
 * @property {(npcId: string, text?: string, choices?: DialogueChoice[]) => void} openDialogue
 * @property {(npcId: string, nodeId: string, text: string, choices?: DialogueChoice[]) => void} openNode
 * @property {(text: string, choices?: DialogueChoice[]) => void} advanceTo
 * @property {() => void} closeDialogue
 * @property {(value: boolean) => void} setPending
 * @property {(message: string | null) => void} setError
 */

export const useDialogueBoxStore = create((set, _get) => ({
  // ─── State ────────────────────────────────────────────────────────────────

  /** ID of the NPC whose dialogue box is open, or null. */
  npcId: null,

  /** Current dialogue-tree node ID, or null when using free-form chat. */
  nodeId: null,

  /** The NPC line of text to display. */
  text: '',

  /** Response option buttons. Empty array = free-text input fallback. */
  choices: [],

  /** Whether the dialogue box is mounted and visible. */
  open: false,

  /** True while an async send/fetch is in progress. */
  pending: false,

  /** Last error message to display, if any. */
  error: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Opens the dialogue box for an NPC at the root / greeting state.
   *
   * @param {string} npcId
   * @param {string} [text='']
   * @param {DialogueChoice[]} [choices=[]]
   */
  openDialogue(npcId, text = '', choices = []) {
    set({
      npcId,
      nodeId: null,
      text,
      choices,
      open: true,
      pending: false,
      error: null,
    });
  },

  /**
   * Opens the dialogue box at a specific tree node.
   *
   * @param {string} npcId
   * @param {string} nodeId
   * @param {string} text
   * @param {DialogueChoice[]} [choices=[]]
   */
  openNode(npcId, nodeId, text, choices = []) {
    set({
      npcId,
      nodeId,
      text,
      choices,
      open: true,
      pending: false,
      error: null,
    });
  },

  /**
   * Advances the dialogue to a new NPC line (same NPC, new node).
   * Preserves npcId; clears the old nodeId until the caller supplies a new one.
   *
   * @param {string} text
   * @param {DialogueChoice[]} [choices=[]]
   */
  advanceTo(text, choices = []) {
    set({ text, choices, nodeId: null, pending: false, error: null });
  },

  /**
   * Closes the dialogue box and resets all state.
   */
  closeDialogue() {
    set({
      npcId: null,
      nodeId: null,
      text: '',
      choices: [],
      open: false,
      pending: false,
      error: null,
    });
  },

  /**
   * Sets the pending (loading) flag.
   *
   * @param {boolean} value
   */
  setPending(value) {
    set({ pending: value });
  },

  /**
   * Sets or clears the error message.
   *
   * @param {string | null} message
   */
  setError(message) {
    set({ error: message, pending: false });
  },
}));

// Expose in dev for debugging.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__dialogueBoxStore = useDialogueBoxStore;
}
