/**
 * dialogueService.js
 *
 * High-level service that orchestrates an NPC conversation turn from end to
 * end.  It combines:
 *
 *   - The static offline pipeline (`dialogue/pipeline`) for instant local
 *     responses when the server is unavailable or the player is offline.
 *   - The online LLM path via the dialogue store's `send()` action, which
 *     POSTs to `/api/dialogue` (Hono server -> Anthropic Claude).
 *   - Quick-reply chips from `dialogue/DialogueManager`.
 *   - Heart-level / interaction-count tracking from `stores/npcStore.js`.
 *
 * The service is intentionally framework-agnostic: it does not import React
 * hooks and can therefore be called from Phaser scenes, Node test scripts, or
 * React event handlers alike.
 *
 * ---------------------------------------------------------------------------
 * Typical usage
 * ---------------------------------------------------------------------------
 *
 *   import { DialogueService } from './services/dialogueService.js';
 *
 *   // Start a session
 *   const session = DialogueService.startSession('marina');
 *
 *   // Send a message (online path: returns the full turn including NPC reply)
 *   const turn = await session.send('Oi, Marina!', worldContext);
 *   console.log(turn.npcReply);   // "Que bom te ver, querido!"
 *
 *   // Send a message (offline / mock path)
 *   const mockReply = session.sendMock('Oi, Marina!', playerContext);
 *   console.log(mockReply);
 *
 *   // End session (records interaction, optionally awards heart points)
 *   session.end({ heartGain: 1 });
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import * as _pipelineModule from '../dialogue/pipeline/index';
import * as _managerModule from '../dialogue/DialogueManager';
import * as _npcStoreModule from '../stores/npcStore';

/**
 * @returns {import('../systems/dialogue/dialogueStore').DialogueState & import('../systems/dialogue/dialogueStore').DialogueActions}
 */
function _dialogueStore() {
  return useDialogueStore.getState();
}

/**
 * @returns {typeof import('../dialogue/pipeline/index')}
 */
function _pipeline() {
  return _pipelineModule;
}

/**
 * @returns {typeof import('../dialogue/DialogueManager')}
 */
function _manager() {
  return _managerModule;
}

/**
 * @returns {typeof import('../stores/npcStore')}
 */
function _npcStore() {
  return _npcStoreModule;
}

// ---------------------------------------------------------------------------
// Session class
// ---------------------------------------------------------------------------

/**
 * A DialogueSession represents an active conversation between the player and
 * one specific NPC.  Instances are created by `DialogueService.startSession`.
 */
export class DialogueSession {
  /**
   * @param {string} npcId
   */
  constructor(npcId) {
    /** @readonly */
    this.npcId = npcId;
    /** @type {boolean} */
    this._ended = false;
  }

  // -------------------------------------------------------------------------
  // Online path
  // -------------------------------------------------------------------------

  /**
   * Send player input to the NPC via the server LLM route and return a
   * resolved turn object once the reply arrives.
   *
   * The dialogue store (`useDialogueStore`) is updated as a side-effect, so
   * any React components subscribed to the store will re-render automatically.
   *
   * @param {string} playerInput
   * @param {{ hour: number, dayInSeason: number, season: string, year: number, weather?: string }} worldContext
   * @returns {Promise<{ playerInput: string, npcReply: string, emotion: string }>}
   */
  async send(playerInput, worldContext) {
    this._assertActive();

    const store = _dialogueStore();

    // Ensure the store is open for this NPC
    if (store.npcId !== this.npcId) {
      store.open(this.npcId);
    }

    const historyLengthBefore = store.history.length;

    await store.send(playerInput, worldContext);

    // Read state after the send completes
    const state = _dialogueStore();
    const lastNpcTurn = state.history.slice(historyLengthBefore).find((t) => t.who === 'npc');

    return {
      playerInput,
      npcReply: lastNpcTurn?.text ?? '',
      emotion: lastNpcTurn?.emotion ?? 'neutral',
    };
  }

  // -------------------------------------------------------------------------
  // Offline / mock path (no network required)
  // -------------------------------------------------------------------------

  /**
   * Generate an instant static response from the offline dialogue pipeline.
   * Does NOT touch the server and does NOT update the dialogue store.
   * Useful for: loading screens, connectivity fallbacks, unit tests.
   *
   * @param {string} playerAction  - One of the PLAYER_ACTIONS keys (e.g. 'greet', 'talk')
   *                                 or a free-form string (treated as 'talk').
   * @param {{ interactionCount?: number, heartLevel?: number }} [playerContext]
   * @returns {string}  - The NPC's static reply line
   */
  sendMock(playerAction, playerContext = {}) {
    this._assertActive();

    const { getActionResponse, PLAYER_ACTIONS } = _pipeline();

    // If the caller passed a raw string that isn't a known action key, default
    // to the TALK action so `getActionResponse` finds a sensible bucket.
    const action = Object.values(PLAYER_ACTIONS).includes(playerAction)
      ? playerAction
      : PLAYER_ACTIONS.TALK;

    // Merge stored context with any caller-supplied overrides
    const storedCtx = _npcStore().getNpcContext(this.npcId);
    const ctx = { ...storedCtx, ...playerContext };

    return getActionResponse(this.npcId, action, ctx);
  }

  /**
   * Get the opening line for this NPC based on current context.
   * Uses `getFirstMeetingLine` for new acquaintances or `getRepeatVisitLine`
   * for returning players.
   *
   * @param {{ interactionCount?: number, heartLevel?: number }} [playerContext]
   * @returns {string}
   */
  getOpeningLine(playerContext = {}) {
    this._assertActive();

    const { classifyContext, getFirstMeetingLine, getRepeatVisitLine } = _pipeline();
    const storedCtx = _npcStore().getNpcContext(this.npcId);
    const ctx = { ...storedCtx, ...playerContext };

    const stage = classifyContext(ctx);
    if (stage === 'first_meeting') {
      return getFirstMeetingLine(this.npcId, ctx.interactionCount ?? 0);
    }
    return getRepeatVisitLine(this.npcId, ctx);
  }

  // -------------------------------------------------------------------------
  // Quick-reply chip helpers
  // -------------------------------------------------------------------------

  /**
   * Return the greeting chips registered for this NPC.
   *
   * @returns {{ label: string, input: string }[]}
   */
  getGreetingChips() {
    this._assertActive();
    return _manager().getGreetings(this.npcId);
  }

  /**
   * Return the topic chip groups registered for this NPC.
   *
   * @returns {Record<string, { label: string, input: string }[]>}
   */
  getTopicChips() {
    this._assertActive();
    return _manager().getTopics(this.npcId);
  }

  /**
   * Return true if a reply text would trigger the shop for this NPC.
   *
   * @param {string} replyText
   * @returns {boolean}
   */
  isShopTrigger(replyText) {
    return _manager().isShopTrigger(this.npcId, replyText);
  }

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  /**
   * End the session.
   * Records one interaction tick and optionally awards heart points.
   * Closes the dialogue store unless `keepOpen` is set to true.
   *
   * @param {{ heartGain?: number, keepOpen?: boolean }} [opts]
   */
  end(opts = {}) {
    if (this._ended) return;
    this._ended = true;

    const npcStoreFns = _npcStore();
    npcStoreFns.recordInteraction(this.npcId);

    if (opts.heartGain && opts.heartGain !== 0) {
      npcStoreFns.addHeartPoints(this.npcId, opts.heartGain);
    }

    if (!opts.keepOpen) {
      _dialogueStore().close();
    }
  }

  /**
   * @returns {boolean}
   */
  get isActive() {
    return !this._ended;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  _assertActive() {
    if (this._ended) {
      throw new Error(
        `DialogueSession for '${this.npcId}' has already ended. Create a new session.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// DialogueService singleton
// ---------------------------------------------------------------------------

/**
 * Stateless factory / utility object.
 * All mutable state is owned by the Zustand stores; this object only
 * orchestrates calls between them.
 */
export const DialogueService = {
  // -------------------------------------------------------------------------
  // Session management
  // -------------------------------------------------------------------------

  /**
   * Create and return a new DialogueSession for the given NPC.
   * Also opens the dialogue store so the UI renders immediately.
   *
   * @param {string} npcId
   * @returns {DialogueSession}
   */
  startSession(npcId) {
    _dialogueStore().open(npcId);
    return new DialogueSession(npcId);
  },

  /**
   * Return a session object for an already-open dialogue (e.g. one opened by
   * pressing E in-world) without re-opening the store.
   * Returns null if no dialogue is currently open.
   *
   * @returns {DialogueSession | null}
   */
  resumeSession() {
    const { npcId } = _dialogueStore();
    if (!npcId) return null;
    return new DialogueSession(npcId);
  },

  // -------------------------------------------------------------------------
  // Stateless helpers
  // -------------------------------------------------------------------------

  /**
   * Classify a player's relationship stage with an NPC.
   * Wraps `classifyContext` from the pipeline for convenience.
   *
   * @param {string} npcId
   * @returns {'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'}
   */
  getRelationshipStage(npcId) {
    const { classifyContext } = _pipeline();
    const ctx = _npcStore().getNpcContext(npcId);
    return classifyContext(ctx);
  },

  /**
   * Return the NPC definition for display purposes (name, role, personality).
   *
   * @param {string} npcId
   * @returns {import('@elysium/shared').NpcDef | undefined}
   */
  getNpcDef(npcId) {
    return _npcStore().getNpc(npcId)?.def;
  },

  /**
   * Return the current heart level for the given NPC (0-10).
   *
   * @param {string} npcId
   * @returns {number}
   */
  getHeartLevel(npcId) {
    return _npcStore().getNpcContext(npcId).heartLevel;
  },

  /**
   * Return the number of times the player has spoken to this NPC.
   *
   * @param {string} npcId
   * @returns {number}
   */
  getInteractionCount(npcId) {
    return _npcStore().getNpcContext(npcId).interactionCount;
  },

  // -------------------------------------------------------------------------
  // Bulk / save-game operations
  // -------------------------------------------------------------------------

  /**
   * Export a serialisable snapshot of all NPC interaction state.
   * Pass the result to `importState` to restore it on the next load.
   *
   * @returns {Array<{ npcId: string, interactionCount: number, heartLevel: number }>}
   */
  exportState() {
    return _npcStore().exportInteractionState();
  },

  /**
   * Restore NPC interaction state from a previously exported snapshot.
   *
   * @param {Array<{ npcId: string, interactionCount: number, heartLevel: number }>} snapshot
   */
  importState(snapshot) {
    _npcStore().importInteractionState(snapshot);
  },
};

// ---------------------------------------------------------------------------
// Named constant re-exports for convenience
// ---------------------------------------------------------------------------

/**
 * All recognised player-action string constants (greet, buy, sell, ...).
 * Forwarded directly from the dialogue pipeline so callers have a single
 * import point.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PLAYER_ACTIONS = _pipeline().PLAYER_ACTIONS;
