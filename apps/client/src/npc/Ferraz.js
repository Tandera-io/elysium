import FERRAZ_DIALOGUE from '../dialogue/FerrazDialogues.js';

export const FERRAZ_NPC_ID = 'ferraz';

export const FERRAZ_DEF = {
  id: FERRAZ_NPC_ID,
  name: 'Ferraz',
  role: 'ferreiro',
  position: { x: 4, z: -6 },
  personality: {
    core_traits: ['grosseiro mas justo', 'apaixonado pelo oficio', 'perfeccionista'],
    speech_style: 'brusco, direto, orgulhoso do trabalho, fala em portugues brasileiro coloquial',
    values: ['metal de qualidade', 'artesanato duradouro', 'honestidade no preco'],
    fears: [
      'ferramentas enferrujadas',
      'trabalho malfeito',
      'clientes que nao cuidam do equipamento',
    ],
  },
  relations: {
    nina: 'concorrente_respeitosa',
    bento: 'cliente_antigo',
  },
  schedule: [
    { from: '06:00', to: '12:00', location: 'ferraria', activity: 'forjar' },
    { from: '12:00', to: '13:00', location: 'casa', activity: 'almocar' },
    { from: '13:00', to: '18:00', location: 'ferraria', activity: 'atender' },
    { from: '18:00', to: '21:00', location: 'praca', activity: 'descansar' },
  ],
  economy_role: {
    produces: ['upgraded_hoe', 'upgraded_watering_can', 'sword', 'pickaxe'],
    consumes: ['ferro', 'minerio_raro', 'carvao'],
    shop_inventory: ['upgraded_hoe', 'upgraded_watering_can', 'pickaxe', 'sword', 'iron_bar'],
  },
};

/**
 * Returns a random greeting line from Ferraz's greeting pool.
 * Used when the player first approaches Ferraz.
 */
export function getFerrazGreeting() {
  const greetings = FERRAZ_DIALOGUE.greetings;
  const index = Math.floor(Math.random() * greetings.length);
  return greetings[index];
}

/**
 * Returns the quick-reply topics for a given category.
 * @param {string} category - One of: 'general' | 'upgrades' | 'crafting'
 * @returns {Array<{label: string, input: string}>}
 */
export function getFerrazTopics(category) {
  return FERRAZ_DIALOGUE.topics[category] ?? FERRAZ_DIALOGUE.topics.general;
}

/**
 * Checks whether a given dialogue line from Ferraz should trigger the shop UI.
 * @param {string} text - The NPC response text to check.
 * @returns {boolean}
 */
export function isFerrazShopTrigger(text) {
  const lower = text.toLowerCase();
  return FERRAZ_DIALOGUE.shopTriggerPhrases.some((phrase) => lower.includes(phrase));
}

const Ferraz = {
  def: FERRAZ_DEF,
  dialogue: FERRAZ_DIALOGUE,
  getGreeting: getFerrazGreeting,
  getTopics: getFerrazTopics,
  isShopTrigger: isFerrazShopTrigger,
};

export default Ferraz;
