// apps/client/src/components/NPCs/NPCDialogue.js
//
// NPCDialogue — stateful conversation manager for brief NPC interactions.
//
// This is a plain-JS utility class (not a React component). It wraps the
// dialogue pipeline and npcDialogues data to provide a simple, multi-turn
// conversation experience entirely offline (no server required).
//
// Exported surface:
//   NPCDialogue                     — class managing one conversation session
//   createNPCDialogue(npcId, opts?) — factory function
//   detectIntent(playerText)        — pure keyword → PLAYER_ACTIONS classifier

import {
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  PLAYER_ACTIONS,
} from '../../dialogue/pipeline/index.js';

import { getConversationFlow, NPC_CONVERSATIONS } from '../../data/npcDialogues.js';

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

/**
 * Keyword maps for intent → PLAYER_ACTIONS classification.
 * Ordered from most specific to least specific.
 */
const INTENT_KEYWORDS = [
  {
    action: PLAYER_ACTIONS.GOODBYE,
    words: ['tchau', 'adeus', 'até', 'sair', 'bye', 'goodbye', 'encerrar', 'fechar'],
  },
  {
    action: PLAYER_ACTIONS.QUEST_COMPLETE,
    words: ['entregar', 'trouxe', 'aqui está', 'aqui tá', 'consegui', 'terminei', 'pronto'],
  },
  {
    action: PLAYER_ACTIONS.QUEST_ACCEPT,
    words: ['aceito', 'vou fazer', 'pode contar', 'topa', 'missão', 'quest', 'tarefa'],
  },
  {
    action: PLAYER_ACTIONS.GIVE_GIFT,
    words: ['presente', 'trouxe', 'te dei', 'pra você', 'minério', 'oferenda'],
  },
  {
    action: PLAYER_ACTIONS.SELL,
    words: ['vender', 'vendo', 'quero vender', 'compra', 'safra', 'colheita'],
  },
  {
    action: PLAYER_ACTIONS.BUY,
    words: ['comprar', 'compro', 'quanto custa', 'preço', 'estoque', 'vende'],
  },
  {
    action: PLAYER_ACTIONS.HARVEST,
    words: ['colhei', 'colhendo', 'colheita', 'safra', 'produto'],
  },
  {
    action: PLAYER_ACTIONS.WATER,
    words: ['regando', 'reguei', 'água', 'regador'],
  },
  {
    action: PLAYER_ACTIONS.PLANT,
    words: ['plantei', 'plantando', 'sementes', 'mudas', 'plantar'],
  },
  {
    action: PLAYER_ACTIONS.GREET,
    words: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'como vai'],
  },
];

/**
 * Classify player text into a PLAYER_ACTIONS key.
 *
 * @param {string} playerText
 * @returns {string} one of PLAYER_ACTIONS values
 */
export function detectIntent(playerText) {
  const lower = playerText.toLowerCase();
  for (const { action, words } of INTENT_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return action;
  }
  return PLAYER_ACTIONS.TALK;
}

// ---------------------------------------------------------------------------
// NPCDialogue class
// ---------------------------------------------------------------------------

/**
 * @typedef {{ who: 'player' | 'npc', text: string }} DialogueTurn
 * @typedef {{ interactionCount?: number, heartLevel?: number }} ConversationContext
 */

export class NPCDialogue {
  /**
   * @param {string} npcId
   * @param {ConversationContext} [opts]
   */
  constructor(npcId, opts = {}) {
    this._npcId = npcId;
    this._interactionCount = opts.interactionCount ?? 0;
    this._heartLevel = opts.heartLevel ?? 0;
    /** @type {DialogueTurn[]} */
    this._history = [];
    this._active = false;
    this._turnCount = 0;
  }

  /** @returns {boolean} */
  isActive() {
    return this._active;
  }

  /** @returns {number} */
  getTurnCount() {
    return this._turnCount;
  }

  /** @returns {DialogueTurn[]} */
  getHistory() {
    return [...this._history];
  }

  /**
   * Begin the conversation. Returns the NPC's opening line.
   * @returns {string}
   */
  start() {
    this._active = true;
    this._turnCount = 0;
    this._history = [];

    const conv = NPC_CONVERSATIONS[this._npcId];
    let line;

    if (conv && this._interactionCount === 0) {
      line = conv.openingLine;
    } else if (this._interactionCount === 0) {
      line = getFirstMeetingLine(this._npcId, 0);
    } else {
      line = getRepeatVisitLine(this._npcId, {
        interactionCount: this._interactionCount,
        heartLevel: this._heartLevel,
      });
    }

    this._history.push({ who: 'npc', text: line });
    return line;
  }

  /**
   * Process player text and return the NPC's reply.
   * If the player says goodbye, ends the conversation and returns a closing line.
   *
   * @param {string} playerText
   * @returns {string}
   */
  respond(playerText) {
    if (!this._active) return '';

    const trimmed = playerText.trim();
    this._history.push({ who: 'player', text: trimmed });
    this._turnCount++;

    const intent = detectIntent(trimmed);

    if (intent === PLAYER_ACTIONS.GOODBYE) {
      return this.end();
    }

    // Try scripted conversation flow first (topic-specific responses)
    const flowLine = getConversationFlow(this._npcId, trimmed, this._turnCount);
    if (flowLine) {
      this._history.push({ who: 'npc', text: flowLine });
      return flowLine;
    }

    // Fall back to pipeline action response
    const context = {
      interactionCount: this._interactionCount,
      heartLevel: this._heartLevel,
    };
    const reply = getActionResponse(this._npcId, intent, context);
    this._history.push({ who: 'npc', text: reply });
    return reply;
  }

  /**
   * End the conversation. Returns a closing line.
   * @returns {string}
   */
  end() {
    this._active = false;

    const conv = NPC_CONVERSATIONS[this._npcId];
    const line =
      conv?.closingLine ??
      getActionResponse(this._npcId, PLAYER_ACTIONS.GOODBYE, {
        interactionCount: this._interactionCount,
        heartLevel: this._heartLevel,
      });

    this._history.push({ who: 'npc', text: line });
    return line;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new NPCDialogue session.
 *
 * @param {string} npcId
 * @param {ConversationContext} [opts]
 * @returns {NPCDialogue}
 */
export function createNPCDialogue(npcId, opts = {}) {
  return new NPCDialogue(npcId, opts);
}

export { PLAYER_ACTIONS };
