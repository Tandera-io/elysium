// apps/client/src/stores/npcStore.js
//
// NPC store — JS adapter for the canonical TypeScript NPC stores plus a
// hand-authored conversation-tree system.
//
// Pattern mirrors stores/timeStore.js and stores/farmingStore.js.
//
// Exposes:
//   useNpcStore          — Zustand store: NPC positions/defs (from systems/npc/npcStore.ts)
//   useDialogueStore     — Zustand store: AI dialogue open/close/send
//   useNpcDialogueStore  — Zustand store: conversation-tree state (tree NPCs only)
//   NPC_DIALOGUES        — hand-authored branching dialogue trees for Nina and Dorinha
//   NPC_IDS              — known NPC id constants
//   getNpcGreeting(id)   — offline fallback greeting string
//   getNpcDialogue(id)   — quick-reply config (greetings + topic groups)
//   openNpcDialogue(id)  — imperative: open tree dialogue for an NPC
//   closeNpcDialogue()   — imperative: close tree dialogue
//   advanceDialogue(id)  — imperative: advance tree by choice id

import { create } from 'zustand';
import { useNpcStore as _useNpcStore } from '../systems/npc/npcStore';
import { useDialogueStore as _useDialogueStore } from '../systems/dialogue/dialogueStore';
import { NINA_DIALOGUE } from '../features/npc/dialogue/nina';
import { DORINHA_DIALOGUE } from '../features/npc/dialogue/dorinha';

// ---------------------------------------------------------------------------
// Re-exports from TypeScript stores
// ---------------------------------------------------------------------------

/** Canonical Zustand NPC store re-exported for JS consumers. */
export { _useNpcStore as useNpcStore };

/** Dialogue store (AI chat open/close/send). */
export { _useDialogueStore as useDialogueStore };

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Selector: all NPCs keyed by id. */
export function useNpcs() {
  return _useNpcStore((s) => s.npcs);
}

/** Selector: a single NPC entry by id (or null). */
export function useNpcById(id) {
  return _useNpcStore((s) => s.npcs[id] ?? null);
}

// ---------------------------------------------------------------------------
// Known NPC IDs
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

const NPC_GREETINGS = {
  marina: 'Que bom te ver! O pão tá fresquinho ainda, pode entrar.',
  bento: 'Ei. Precisando de algo na fazenda?',
  lucia: 'Olá! Só um segundo, tô com os animais.',
  dorinha: 'Oi! Chegou na hora certa — olha o que tenho hoje!',
  nina: 'Bom dia! Precisando de alguma ferramenta?',
};

/** Returns the offline fallback greeting string for the given NPC id. */
export function getNpcGreeting(npcId) {
  return NPC_GREETINGS[npcId] ?? 'Olá!';
}

// ---------------------------------------------------------------------------
// Quick-reply dialogue configs (for AI-mode quick buttons)
// ---------------------------------------------------------------------------

const QUICK_REPLY_CONFIGS = {
  nina: NINA_DIALOGUE,
  dorinha: DORINHA_DIALOGUE,
};

/**
 * Returns the quick-reply dialogue config for the given NPC id, or null.
 * Used by components that want greeting + topic quick-reply buttons.
 *
 * @param {string} npcId
 * @returns {{ npcId: string, greetings: Array<{label:string,input:string}>, topics: Record<string,Array<{label:string,input:string}>>, shopTriggerPhrases: string[] } | null}
 */
export function getNpcDialogue(npcId) {
  return QUICK_REPLY_CONFIGS[npcId] ?? null;
}

// ---------------------------------------------------------------------------
// Hand-authored conversation trees
//
// Each NPC entry has a `tree` map of node-id -> DialogueNode.
//
// DialogueNode:
//   id      : string     — unique key within tree
//   text    : string     — NPC speech at this node
//   choices : Array<{
//     id    : string,    — unique key within node
//     label : string,    — player-visible button text
//     next  : string | null — next node id, or null = close dialogue
//   }>
// ---------------------------------------------------------------------------

/** @type {Record<string, { name: string, role: string, tree: Record<string, object> }>} */
export const NPC_DIALOGUES = {
  nina: {
    name: 'Nina',
    role: 'ferramenteira',
    tree: {
      start: {
        id: 'start',
        text: 'Oi! Bem-vindo à ferragem. Tô aqui pra te ajudar a escolher a ferramenta certa. O que você precisa?',
        choices: [
          { id: 'c_tools', label: 'Quero ver ferramentas', next: 'tools' },
          { id: 'c_seeds', label: 'Quero sementes especiais', next: 'seeds' },
          { id: 'c_tip', label: 'Tem alguma dica de plantio?', next: 'tip' },
          { id: 'c_bye', label: 'Até mais!', next: null },
        ],
      },
      tools: {
        id: 'tools',
        text: 'Tenho regador, enxada e adubo. Ferramenta boa é investimento — não compra coisa fraca que quebra na primeira chuva!',
        choices: [
          { id: 'c_tools_watering', label: 'Me fala do regador', next: 'tools_watering' },
          { id: 'c_tools_hoe', label: 'Me fala da enxada', next: 'tools_hoe' },
          { id: 'c_tools_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back', label: 'Voltar', next: 'start' },
        ],
      },
      tools_watering: {
        id: 'tools_watering',
        text: 'Esse regador é de aço galvanizado — não enferruja nunca. Capacidade pra 10 litros, dá pra regar umas 8 canteiras sem voltar no poço.',
        choices: [
          { id: 'c_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back_tools', label: 'Ver outras ferramentas', next: 'tools' },
        ],
      },
      tools_hoe: {
        id: 'tools_hoe',
        text: 'A enxada tem cabo de ipê — madeira dura. Lâmina temperada, afia direitinho. Ideal pra preparar o solo antes do plantio.',
        choices: [
          { id: 'c_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back_tools', label: 'Ver outras ferramentas', next: 'tools' },
        ],
      },
      seeds: {
        id: 'seeds',
        text: 'Tenho sementes de abóbora e morango — as duas têm produção alta se você cuidar direito da irrigação.',
        choices: [
          { id: 'c_seeds_pumpkin', label: 'Sementes de abóbora', next: 'seeds_pumpkin' },
          { id: 'c_seeds_strawberry', label: 'Sementes de morango', next: 'seeds_strawberry' },
          { id: 'c_seeds_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back', label: 'Voltar', next: 'start' },
        ],
      },
      seeds_pumpkin: {
        id: 'seeds_pumpkin',
        text: 'Abóbora é boa no outono. Cresce em 6 dias e rende bem. Só precisar cuidar pra não deixar o solo secar muito.',
        choices: [
          { id: 'c_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back_seeds', label: 'Ver outras sementes', next: 'seeds' },
        ],
      },
      seeds_strawberry: {
        id: 'seeds_strawberry',
        text: 'Morango é mais delicado, mas vende bem no mercado. Planta na primavera pra ter resultado ótimo. Rega todo dia.',
        choices: [
          { id: 'c_buy', label: 'Quero comprar (aperta G)', next: 'shop_prompt' },
          { id: 'c_back_seeds', label: 'Ver outras sementes', next: 'seeds' },
        ],
      },
      tip: {
        id: 'tip',
        text: 'Dica de ouro: prepara o solo com enxada antes de plantar e usa adubo logo depois. Aumenta o rendimento em até 40%. Não pula etapa!',
        choices: [
          { id: 'c_tip_more', label: 'Tem mais dica?', next: 'tip2' },
          { id: 'c_back', label: 'Obrigado, voltar', next: 'start' },
        ],
      },
      tip2: {
        id: 'tip2',
        text: 'Outra coisa importante: ferramenta enferrujada estraga o plantio. Passa um pano com óleo depois de usar. Simples assim.',
        choices: [
          { id: 'c_back', label: 'Bom saber, obrigado!', next: 'start' },
          { id: 'c_bye', label: 'Tchau, Nina!', next: null },
        ],
      },
      shop_prompt: {
        id: 'shop_prompt',
        text: 'Claro! Pressiona G pra abrir minha loja e escolhe o que precisa. Qualquer dúvida me fala!',
        choices: [
          { id: 'c_back', label: 'Voltar a conversar', next: 'start' },
          { id: 'c_bye', label: 'Valeu, tchau!', next: null },
        ],
      },
    },
  },

  dorinha: {
    name: 'Dorinha',
    role: 'quitandeira',
    tree: {
      start: {
        id: 'start',
        text: 'Ei, chegou cedo hoje! Tô com sementes fresquinhas e ainda compro a sua safra. O que é que vem fazer aqui?',
        choices: [
          { id: 'c_buy', label: 'Quero comprar sementes', next: 'buy' },
          { id: 'c_sell', label: 'Vim vender minha safra', next: 'sell' },
          { id: 'c_chat', label: 'Só pra bater um papo', next: 'chat' },
          { id: 'c_bye', label: 'Até mais!', next: null },
        ],
      },
      buy: {
        id: 'buy',
        text: 'Tenho trigo, tomate e milho — tudo de boa qualidade. Pressiona G pra abrir a quitanda e escolhe à vontade!',
        choices: [
          { id: 'c_buy_wheat', label: 'Me fala do trigo', next: 'buy_wheat' },
          { id: 'c_buy_tomato', label: 'Me fala do tomate', next: 'buy_tomato' },
          { id: 'c_buy_corn', label: 'Me fala do milho', next: 'buy_corn' },
          { id: 'c_back', label: 'Voltar', next: 'start' },
        ],
      },
      buy_wheat: {
        id: 'buy_wheat',
        text: 'Trigo é o básico da fazenda — pronto em 4 dias e vende bem em qualquer época. Semente de boa procedência, germina direitinho.',
        choices: [
          { id: 'c_open_shop', label: 'Abrir quitanda (G)', next: 'shop_hint' },
          { id: 'c_back_buy', label: 'Ver outras sementes', next: 'buy' },
        ],
      },
      buy_tomato: {
        id: 'buy_tomato',
        text: 'Tomate dá bastante trabalho mas o preço compensa. Rega todo dia e fica de olho na seca — ele não gosta de terra muito seca.',
        choices: [
          { id: 'c_open_shop', label: 'Abrir quitanda (G)', next: 'shop_hint' },
          { id: 'c_back_buy', label: 'Ver outras sementes', next: 'buy' },
        ],
      },
      buy_corn: {
        id: 'buy_corn',
        text: 'Milho é resistente e produz bastante por canteiro. Bom pra quem tá começando. Pronto em 5 dias e o preço é sempre estável.',
        choices: [
          { id: 'c_open_shop', label: 'Abrir quitanda (G)', next: 'shop_hint' },
          { id: 'c_back_buy', label: 'Ver outras sementes', next: 'buy' },
        ],
      },
      sell: {
        id: 'sell',
        text: 'Tô comprando trigo a 50, tomate a 70 e milho a 60 por unidade hoje. Paga na hora, sem enrolação. Quanto você trouxe?',
        choices: [
          { id: 'c_sell_wheat', label: 'Tenho trigo', next: 'sell_confirm' },
          { id: 'c_sell_tomato', label: 'Tenho tomate', next: 'sell_confirm' },
          { id: 'c_sell_corn', label: 'Tenho milho', next: 'sell_confirm' },
          { id: 'c_back', label: 'Só tava perguntando', next: 'start' },
        ],
      },
      sell_confirm: {
        id: 'sell_confirm',
        text: 'Ótimo! Usa o inventário pra fazer a troca — pressiona G pra abrir minha loja. Te pago certinho!',
        choices: [
          { id: 'c_back', label: 'Entendi, obrigado!', next: 'start' },
          { id: 'c_bye', label: 'Combinado, até mais!', next: null },
        ],
      },
      chat: {
        id: 'chat',
        text: 'Que bom! Essa fazenda tá crescendo bonita. Eu e a Marina tamo conversando pra fazer uma feira na praça semana que vem. Você vem?',
        choices: [
          { id: 'c_chat_yes', label: 'Com certeza, adoro!', next: 'chat_fair' },
          {
            id: 'c_chat_marina',
            label: 'Você e a Marina se conhecem faz tempo?',
            next: 'chat_marina',
          },
          { id: 'c_back', label: 'Legal, depois a gente vê', next: 'start' },
        ],
      },
      chat_fair: {
        id: 'chat_fair',
        text: 'Que animação! A gente vai vender direto pras famílias da região — sem atravessador. Cada produtor fica com o lucro todo!',
        choices: [
          { id: 'c_back', label: 'Adorei a ideia!', next: 'start' },
          { id: 'c_bye', label: 'Tchau, Dorinha!', next: null },
        ],
      },
      chat_marina: {
        id: 'chat_marina',
        text: 'Desde criança! A gente cresceu aqui na região. Ela faz o pão, eu vendo a semente — a cidade toda depende da gente! Haha.',
        choices: [
          { id: 'c_back', label: 'Que bonito isso!', next: 'start' },
          { id: 'c_bye', label: 'Tchau, Dorinha!', next: null },
        ],
      },
      shop_hint: {
        id: 'shop_hint',
        text: 'Aperta G pra abrir a quitanda. Tô aqui do lado, qualquer coisa me chama!',
        choices: [
          { id: 'c_back', label: 'Valeu!', next: 'start' },
          { id: 'c_bye', label: 'Até mais, Dorinha!', next: null },
        ],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Zustand store — conversation-tree dialogue state
// ---------------------------------------------------------------------------

/**
 * useNpcDialogueStore — manages which NPC's hand-authored dialogue tree is
 * open and which node is currently shown.
 *
 * State:
 *   activeNpcId   : string | null
 *   currentNodeId : string
 *   npcState      : Record<string, { daysTalked: number, heartLevel: number }>
 *
 * Actions:
 *   open(npcId)      — start dialogue (resets node to 'start', increments daysTalked)
 *   close()          — close the dialogue
 *   choose(choiceId) — advance to next node or close when choice.next === null
 */
export const useNpcDialogueStore = create((set, get) => ({
  activeNpcId: null,
  currentNodeId: 'start',
  npcState: {
    nina: { daysTalked: 0, heartLevel: 0 },
    dorinha: { daysTalked: 0, heartLevel: 0 },
    marina: { daysTalked: 0, heartLevel: 0 },
    bento: { daysTalked: 0, heartLevel: 0 },
    lucia: { daysTalked: 0, heartLevel: 0 },
  },

  open: (npcId) => {
    if (!NPC_DIALOGUES[npcId]) return;
    set((s) => ({
      activeNpcId: npcId,
      currentNodeId: 'start',
      npcState: {
        ...s.npcState,
        [npcId]: {
          ...(s.npcState[npcId] ?? { heartLevel: 0 }),
          daysTalked: (s.npcState[npcId]?.daysTalked ?? 0) + 1,
        },
      },
    }));
  },

  close: () => set({ activeNpcId: null, currentNodeId: 'start' }),

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
      set({ activeNpcId: null, currentNodeId: 'start' });
    } else {
      set({ currentNodeId: choice.next });
    }
  },
}));

// ---------------------------------------------------------------------------
// Convenience imperative helpers
// ---------------------------------------------------------------------------

/** Open the conversation-tree dialogue for a given NPC id. */
export function openNpcDialogue(npcId) {
  useNpcDialogueStore.getState().open(npcId);
}

/** Close the active conversation-tree dialogue. */
export function closeNpcDialogue() {
  useNpcDialogueStore.getState().close();
}

/** Advance dialogue by selecting a choice id. */
export function advanceDialogue(choiceId) {
  useNpcDialogueStore.getState().choose(choiceId);
}
