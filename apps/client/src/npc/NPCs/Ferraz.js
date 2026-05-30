// apps/client/src/npc/NPCs/Ferraz.js
//
// Ferraz — the village blacksmith. Works at the ferraria (forge).
// Sells and upgrades tools and weapons. Gruff but passionate about
// his craft; respects quality materials and honest hard work.

import {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  PLAYER_ACTIONS,
} from '../../dialogue/pipeline/index.js';

export const FERRAZ_NPC_ID = 'ferraz';

/** @typedef {{ label: string, input: string }} FerrazQuickReply */

/** @type {FerrazQuickReply[]} */
export const FERRAZ_GREETINGS = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
];

/** @type {Record<string, FerrazQuickReply[]>} */
export const FERRAZ_TOPICS = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
  ],
  upgrades: [
    { label: 'Melhorar enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Melhorar regador', input: 'Você consegue reforçar meu regador?' },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente.' },
  ],
  crafting: [
    { label: 'Forjar espada', input: 'Você forja armas também?' },
    {
      label: 'Materiais necessários',
      input: 'Que materiais você precisa para forjar algo especial?',
    },
    { label: 'Tempo de produção', input: 'Quanto tempo leva para forjar uma ferramenta nova?' },
  ],
};

/** @type {string[]} */
export const FERRAZ_SHOP_TRIGGER_PHRASES = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
];

// ---------------------------------------------------------------------------
// Predefined dialogue responses used by the offline pipeline fallback.
// These are returned when ANTHROPIC_API_KEY is not set.
// ---------------------------------------------------------------------------

/**
 * Get a single predefined response from Ferraz for a player action.
 *
 * @param {string} playerAction — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getFerrazResponse(playerAction, context = {}) {
  return getActionResponse(FERRAZ_NPC_ID, playerAction, context);
}

/**
 * Get the first-meeting greeting from Ferraz.
 *
 * @param {number} [seed]
 * @returns {string}
 */
export function getFerrazFirstMeeting(seed = 0) {
  return getFirstMeetingLine(FERRAZ_NPC_ID, seed);
}

/**
 * Get a repeat-visit line from Ferraz appropriate to the relationship stage.
 *
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getFerrazRepeatVisit(context = {}) {
  return getRepeatVisitLine(FERRAZ_NPC_ID, context);
}

/**
 * Trigger a full dialogue turn with Ferraz. Returns an array of response
 * strings (one element today, kept as array for future multi-line support).
 *
 * @param {string} playerAction — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string[]}
 */
export function triggerFerrazDialogue(playerAction, context = {}) {
  return triggerDialogue(FERRAZ_NPC_ID, playerAction, context);
}

// Re-export PLAYER_ACTIONS so callers can import them directly from this file.
export { PLAYER_ACTIONS };

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
};

export default FERRAZ_DIALOGUE;
