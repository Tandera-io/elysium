// apps/client/src/stores/npcStore.js
//
// NPC store adapter — two responsibilities in one module:
//
// 1. ACTION-REACTION BUBBLE STORE (useNpcActionStore / notifyNpcAction)
//    Short, auto-dismissing NPC reactions to player farm actions (harvest,
//    plant, water, sell, etc.).  Drives the NPCDialog component.
//
// 2. FULL DIALOGUE ADAPTER (re-exports, trees, useNpcDialogueStore)
//    Re-exports canonical TS stores; exposes NPC_DIALOGUES branching trees,
//    per-NPC dialogue state tracking (hasGreeted, interactionCount, heartLevel),
//    and imperative helpers for the NPCDialogue / NPCDialog.tsx overlay.
//
// Exported surface (all):
//   useNpcActionStore, notifyNpcAction  — action-reaction bubble
//   PLAYER_ACTIONS                      — exhaustive action key map
//   useNpcStore, useDialogueStore       — re-exports from TS stores
//   useNpcs(), useNpcById(id)           — selectors
//   NPC_IDS                             — canonical id constants
//   NPC_GREETINGS                       — offline fallback greeting strings
//   getNpcGreeting(npcId, context?)     — context-aware offline greeting
//   getNpcDialogue(npcId)               — quick-reply config or null
//   NPC_DIALOGUES                       — hand-authored branching trees
//   useNpcDialogueStore                 — Zustand conversation-tree store
//   openNpcDialogue(id)                 — imperative open
//   closeNpcDialogue()                  — imperative close
//   advanceDialogue(choiceId)           — imperative choice advance

import { create } from 'zustand';
import { useNpcStore } from '../systems/npc/npcStore';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import NINA_DIALOGUE from '../features/npc/dialogue/nina';
import DORINHA_DIALOGUE from '../features/npc/dialogue/dorinha';
import {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
} from '../dialogue/pipeline/index';

// ---------------------------------------------------------------------------
// Re-export helpers and canonical TS stores
// ---------------------------------------------------------------------------

export {
  useNpcStore,
  useDialogueStore,
  PLAYER_ACTIONS,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Returns all NPCs from the canonical store. */
export function useNpcs() {
  return useNpcStore((s) => s.npcs);
}

/**
 * Returns a single NPC entry by id, or null.
 * @param {string} id
 */
export function useNpcById(id) {
  return useNpcStore((s) => s.npcs[id] ?? null);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NPC_IDS = /** @type {const} */ ({
  NINA: 'nina',
  DORINHA: 'dorinha',
  MARINA: 'marina',
  BENTO: 'bento',
  LUCIA: 'lucia',
});

// ---------------------------------------------------------------------------
// Offline fallback greetings
// ---------------------------------------------------------------------------

export const NPC_GREETINGS = {
  [NPC_IDS.NINA]: 'Oi! Bem-vinda à ferragem. Em que posso ajudar?',
  [NPC_IDS.DORINHA]: 'Chegou na hora certa! Tô com muita coisa boa hoje.',
  [NPC_IDS.MARINA]: 'Que bom te ver! O pão tá saindo do forno agora.',
  [NPC_IDS.BENTO]: 'Ei. Precisando de algo na fazenda?',
  [NPC_IDS.LUCIA]: 'Olá! Só um segundo, tô com os animais.',
};

/**
 * Returns a context-aware offline greeting for the given NPC.
 * Falls back to static NPC_GREETINGS when no context is provided.
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getNpcGreeting(npcId, context = {}) {
  const count = context.interactionCount ?? 0;
  if (count === 0) return getFirstMeetingLine(npcId, 0);
  if (count > 0) return getRepeatVisitLine(npcId, context);
  return NPC_GREETINGS[npcId] ?? 'Olá!';
}

// ---------------------------------------------------------------------------
// Dialogue configs (quick-reply greetings + shop trigger phrases)
// ---------------------------------------------------------------------------

const NPC_DIALOGUE_CONFIGS = {
  [NPC_IDS.NINA]: NINA_DIALOGUE,
  [NPC_IDS.DORINHA]: DORINHA_DIALOGUE,
};

/**
 * Returns the quick-reply config for an NPC, or null if not configured.
 * @param {string} npcId
 */
export function getNpcDialogue(npcId) {
  return NPC_DIALOGUE_CONFIGS[npcId] ?? null;
}

// ---------------------------------------------------------------------------
// Hand-authored branching dialogue trees (nina + dorinha)
// ---------------------------------------------------------------------------

export const NPC_DIALOGUES = {
  nina: {
    name: 'Nina',
    role: 'ferramenteira',
    tree: {
      root: {
        id: 'root',
        text: 'Oi! Bem-vinda à ferragem. Em que posso ajudar?',
        choices: [
          { id: 'c_tools', label: 'Quero ver ferramentas', next: 'tools' },
          { id: 'c_seeds', label: 'Quero ver sementes', next: 'seeds' },
          { id: 'c_chat', label: 'Só bater papo', next: 'chat' },
          { id: 'c_bye', label: 'Até mais!', next: null },
        ],
      },
      tools: {
        id: 'tools',
        text: 'Tenho regador, enxada e adubo. Tudo de qualidade. O que você precisa?',
        choices: [
          { id: 'c_buy_tools', label: 'Quero comprar', next: 'buy_tools' },
          { id: 'c_back', label: 'Deixa pra depois', next: 'root' },
        ],
      },
      buy_tools: {
        id: 'buy_tools',
        text: 'Ótima escolha! Ferramenta boa é investimento, não gasto. Pode deixar comigo.',
        choices: [
          { id: 'c_shop', label: 'Abrir a ferragem', next: null },
          { id: 'c_back', label: 'Voltar', next: 'root' },
        ],
      },
      seeds: {
        id: 'seeds',
        text: 'Tenho sementes de abóbora e morango. Semente boa é metade da colheita.',
        choices: [
          { id: 'c_buy_seeds', label: 'Quero comprar sementes', next: 'buy_seeds' },
          { id: 'c_back', label: 'Deixa pra depois', next: 'root' },
        ],
      },
      buy_seeds: {
        id: 'buy_seeds',
        text: 'Pode escolher. Todo sementinha aqui sai de fornecedor de confiança.',
        choices: [
          { id: 'c_shop', label: 'Abrir a ferragem', next: null },
          { id: 'c_back', label: 'Voltar', next: 'root' },
        ],
      },
      chat: {
        id: 'chat',
        text: 'Que bom! Adoro conversar entre um cliente e outro. O Bento comprou enxada nova semana passada.',
        choices: [
          { id: 'c_about_bento', label: 'Falar sobre o Bento', next: 'about_bento' },
          { id: 'c_tips', label: 'Dica de ferramenta', next: 'tips' },
          { id: 'c_bye', label: 'Até logo!', next: null },
        ],
      },
      about_bento: {
        id: 'about_bento',
        text: 'O Bento é meu cliente mais fiel! Reclama do preço mas compra tudo igualmente.',
        choices: [{ id: 'c_back', label: 'Entendi, obrigada', next: 'root' }],
      },
      tips: {
        id: 'tips',
        text: 'Dica: sempre afie sua enxada antes do plantio. Ferramenta certa economiza esforço.',
        choices: [{ id: 'c_back', label: 'Boa dica, obrigada!', next: 'root' }],
      },
    },
  },

  dorinha: {
    name: 'Dorinha',
    role: 'quitandeira',
    tree: {
      root: {
        id: 'root',
        text: 'Chegou na hora certa! Tô com muita coisa boa. Vai comprar ou vender hoje?',
        choices: [
          { id: 'c_buy', label: 'Quero comprar sementes', next: 'buy' },
          { id: 'c_sell', label: 'Quero vender safra', next: 'sell' },
          { id: 'c_chat', label: 'Só conversar um pouco', next: 'chat' },
          { id: 'c_bye', label: 'Até mais!', next: null },
        ],
      },
      buy: {
        id: 'buy',
        text: 'Tenho trigo, tomate e milho. Preço justo, semente fresquinha. O que vai querer?',
        choices: [
          { id: 'c_open_shop', label: 'Abrir a quitanda', next: null },
          { id: 'c_back', label: 'Deixa pra depois', next: 'root' },
        ],
      },
      sell: {
        id: 'sell',
        text: 'Boa! Compro trigo, tomate e milho. Pago na hora, pode trazer tudo.',
        choices: [
          { id: 'c_sell_action', label: 'Vender colheita', next: null },
          { id: 'c_back', label: 'Depois eu trago', next: 'root' },
        ],
      },
      chat: {
        id: 'chat',
        text: 'Conversar é o que não falta aqui! A Marina tava dizendo que o trigo tá escasso essa semana.',
        choices: [
          { id: 'c_marina', label: 'Falar sobre a Marina', next: 'about_marina' },
          { id: 'c_harvest', label: 'Sobre a safra', next: 'harvest_tips' },
          { id: 'c_bye', label: 'Entendi, até mais!', next: null },
        ],
      },
      about_marina: {
        id: 'about_marina',
        text: 'A Marina é minha amiga de infância! Às vezes ela pega farinha de trigo aqui, boa pessoa.',
        choices: [{ id: 'c_back', label: 'Que história bonita!', next: 'root' }],
      },
      harvest_tips: {
        id: 'harvest_tips',
        text: 'Essa época é ótima pra milho. Se você plantar agora, dá pra colher antes da chuva forte.',
        choices: [{ id: 'c_back', label: 'Boa dica, obrigada!', next: 'root' }],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Zustand conversation-tree store with per-NPC dialogue state tracking
//
// State per NPC (in npcState[npcId]):
//   hasGreeted      — true after first open()
//   interactionCount — incremented on every open()
//   heartLevel       — 0-10, increased via gainHeart()
//   currentLines     — most recent pipeline output for this NPC
// ---------------------------------------------------------------------------

function makeDefaultNpcEntry() {
  return { hasGreeted: false, interactionCount: 0, heartLevel: 0, currentLines: [] };
}

function ensureEntry(npcState, npcId) {
  return npcState[npcId] ?? makeDefaultNpcEntry();
}

export const useNpcDialogueStore = create((set, get) => ({
  /** @type {string | null} */
  activeNpcId: null,
  currentNodeId: 'root',
  /** @type {Record<string, { hasGreeted: boolean, interactionCount: number, heartLevel: number, currentLines: string[] }>} */
  npcState: {},

  /**
   * Opens the branching dialogue tree for the given NPC.
   * Increments interactionCount; generates a context-aware opening line.
   *
   * @param {string} npcId
   */
  open: (npcId) => {
    set((s) => {
      const prev = ensureEntry(s.npcState, npcId);
      // Use count BEFORE incrementing so first open → count=0 → first_meeting line.
      const openingLine = getActionResponse(npcId, PLAYER_ACTIONS.GREET, {
        interactionCount: prev.interactionCount,
        heartLevel: prev.heartLevel,
      });
      return {
        activeNpcId: npcId,
        currentNodeId: 'root',
        npcState: {
          ...s.npcState,
          [npcId]: {
            ...prev,
            hasGreeted: true,
            interactionCount: prev.interactionCount + 1,
            currentLines: [openingLine],
          },
        },
      };
    });
  },

  /** Closes the active dialogue without changing NPC state. */
  close: () => set({ activeNpcId: null, currentNodeId: 'root' }),

  /**
   * Advances the conversation tree by selecting a choice.
   * A choice with next === null closes the dialogue (and records a goodbye).
   *
   * @param {string} choiceId
   */
  choose: (choiceId) => {
    const { activeNpcId, currentNodeId } = get();
    if (!activeNpcId) return;

    const tree = NPC_DIALOGUES[activeNpcId]?.tree;
    if (!tree) return;
    const node = tree[currentNodeId];
    if (!node) return;
    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    if (choice.next === null) {
      set((s) => {
        const prev = ensureEntry(s.npcState, activeNpcId);
        const goodbyeLine = getActionResponse(activeNpcId, PLAYER_ACTIONS.GOODBYE, {
          interactionCount: prev.interactionCount,
          heartLevel: prev.heartLevel,
        });
        return {
          activeNpcId: null,
          currentNodeId: 'root',
          npcState: {
            ...s.npcState,
            [activeNpcId]: { ...prev, currentLines: [goodbyeLine] },
          },
        };
      });
      return;
    }
    set({ currentNodeId: choice.next });
  },

  /**
   * Fires a pipeline action for an NPC and stores the resulting lines.
   * Does NOT open the dialogue overlay — use open() for that.
   *
   * @param {string} npcId
   * @param {string} action — one of PLAYER_ACTIONS values
   * @returns {string[]}
   */
  triggerAction: (npcId, action) => {
    const s = get();
    const prev = ensureEntry(s.npcState, npcId);
    const lines = triggerDialogue(npcId, action, {
      interactionCount: prev.interactionCount,
      heartLevel: prev.heartLevel,
    });
    set((cur) => ({
      npcState: {
        ...cur.npcState,
        [npcId]: { ...ensureEntry(cur.npcState, npcId), currentLines: lines },
      },
    }));
    return lines;
  },

  /**
   * Increases heartLevel for the given NPC (capped at 10).
   *
   * @param {string} npcId
   * @param {number} [amount]
   */
  gainHeart: (npcId, amount = 1) => {
    set((s) => {
      const prev = ensureEntry(s.npcState, npcId);
      return {
        npcState: {
          ...s.npcState,
          [npcId]: { ...prev, heartLevel: Math.min(10, prev.heartLevel + amount) },
        },
      };
    });
  },
}));

// ---------------------------------------------------------------------------
// Action-reaction bubble store (short auto-dismissing NPC comments)
// ---------------------------------------------------------------------------

/**
 * useNpcActionStore — ephemeral, action-triggered NPC comment state.
 *
 * State:
 *   npcId   : string | null  — NPC who is speaking
 *   message : string         — the line to display
 *   action  : string | null  — which action triggered this
 *
 * Actions:
 *   trigger(npcId, playerAction, context?) — pick a response and show it
 *   dismiss()                              — clear the message
 */
export const useNpcActionStore = create((set) => ({
  npcId: null,
  message: '',
  action: null,

  trigger: (npcId, playerAction, context = {}) => {
    const lines = triggerDialogue(npcId, playerAction, context);
    if (!lines.length) return;
    set({ npcId, message: lines[0], action: playerAction });
  },

  dismiss: () => set({ npcId: null, message: '', action: null }),
}));

// ---------------------------------------------------------------------------
// Imperative helpers (callable outside React — Phaser scenes, game systems)
// ---------------------------------------------------------------------------

/**
 * Trigger an NPC action comment imperatively.
 *
 * @param {string} npcId
 * @param {string} playerAction  — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 */
export function notifyNpcAction(npcId, playerAction, context = {}) {
  useNpcActionStore.getState().trigger(npcId, playerAction, context);
}

export function openNpcDialogue(npcId) {
  useNpcDialogueStore.getState().open(npcId);
}

export function closeNpcDialogue() {
  useNpcDialogueStore.getState().close();
}

export function advanceDialogue(choiceId) {
  useNpcDialogueStore.getState().choose(choiceId);
}
