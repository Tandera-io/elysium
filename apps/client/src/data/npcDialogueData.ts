/**
 * Static dialogue tree data for NPC interactions (Stardew-style).
 *
 * Each NPC entry maps dialogue node IDs to { text, choices }.
 * choices: Array<{ label, next }> — next is the ID of the following node,
 * or null to close the dialogue.
 *
 * Dorinha is the primary focus (task t_9d2e5177). Other NPCs have a minimal
 * greeting tree so the component works for the full roster.
 */

export interface DialogueChoice {
  label: string;
  /** ID of the next node, or null to close the dialogue. */
  next: string | null;
}

export interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}

export type DialogueTree = Record<string, DialogueNode>;

// ─── Dorinha (seed vendor) ────────────────────────────────────────────────────
const dorinha: DialogueTree = {
  start: {
    text: 'Oi, oi! Chegou na hora certa — acabei de receber um carregamento novo de sementes! O que você quer saber?',
    choices: [
      { label: 'O que você tem de sementes?', next: 'seeds_overview' },
      { label: 'Como eu planto direito?', next: 'planting_tips' },
      { label: 'Como você está hoje?', next: 'how_are_you' },
      { label: 'Até mais!', next: null },
    ],
  },
  seeds_overview: {
    text: 'Tenho trigo, tomate e milho no estoque agora. Cada um tem seu tempo de colheita — tem algum que te interessa mais?',
    choices: [
      { label: 'Me fala do trigo.', next: 'seed_wheat' },
      { label: 'Me fala do tomate.', next: 'seed_tomato' },
      { label: 'Me fala do milho.', next: 'seed_corn' },
      { label: 'Obrigado, até mais!', next: null },
    ],
  },
  seed_wheat: {
    text: 'Trigo é o básico! Cresce em 4 dias, aguenta qualquer estação. Ótimo para começar a colheita. Você vai querer uns 10 pés pelo menos.',
    choices: [
      { label: 'Ver outras sementes.', next: 'seeds_overview' },
      { label: 'Perfeito, valeu!', next: null },
    ],
  },
  seed_tomato: {
    text: 'Tomate leva 6 dias mas produz várias vezes — você colhe, a planta fica! Vale muito na venda. Cuidado com a seca, ele precisa de água todo dia.',
    choices: [
      { label: 'Ver outras sementes.', next: 'seeds_overview' },
      { label: 'Entendido, valeu!', next: null },
    ],
  },
  seed_corn: {
    text: 'Milho demora 8 dias, mas cada pé dá uma quantidade enorme. Se você tem espaço na fazenda, é o melhor retorno por sementinha plantada!',
    choices: [
      { label: 'Ver outras sementes.', next: 'seeds_overview' },
      { label: 'Vou pensar, valeu!', next: null },
    ],
  },
  planting_tips: {
    text: 'Primeiro, capina o canteiro com a enxada. Depois planta a semente e rega todo dia. Chuva conta também — na chuva você pula a rega. Simples assim!',
    choices: [
      { label: 'E se esquecer de regar?', next: 'forgot_water' },
      { label: 'Entendido! Obrigado.', next: null },
    ],
  },
  forgot_water: {
    text: 'Ah, planta murchinha é planta triste! Se passar dois dias sem água, você perde. Mas não se preocupa — acontece com todo fazendeiro iniciante. Aprende rápido!',
    choices: [
      { label: 'Que dica boa!', next: null },
      { label: 'Tem mais dicas?', next: 'planting_tips' },
    ],
  },
  how_are_you: {
    text: 'Tô ótima! Esse sol hoje me deixa animada. A loja tá cheia de gente curiosa — adoro quando novos fazendeiros chegam na vila. Você tá se adaptando bem?',
    choices: [
      { label: 'Tô adorando por aqui!', next: 'dorinha_happy' },
      { label: 'Ainda tô me acostumando…', next: 'dorinha_encouraging' },
    ],
  },
  dorinha_happy: {
    text: 'Fico feliz! A nossa vilinha tem um charme especial, né? Qualquer coisa que precisar — sementes, dicas — pode contar comigo!',
    choices: [{ label: 'Com certeza! Até mais.', next: null }],
  },
  dorinha_encouraging: {
    text: 'Normal! Eu também demorei um tempo quando me mudei aqui. Mas a terra é boa, as pessoas são acolhedoras. Você vai ver — em duas semanas já vai estar se sentindo em casa!',
    choices: [
      { label: 'Obrigado pelo incentivo!', next: null },
      { label: 'Tem dicas pra eu começar?', next: 'planting_tips' },
    ],
  },
};

// ─── Marina (baker) ─────────────────────────────────────────────────────────
const marina: DialogueTree = {
  start: {
    text: 'Olá! Acabei de tirar um pão do forno. Posso te ajudar em algo?',
    choices: [
      { label: 'Tem algo à venda?', next: 'shop_hint' },
      { label: 'Só vim dar oi!', next: 'friendly' },
      { label: 'Até mais!', next: null },
    ],
  },
  shop_hint: {
    text: 'Tenho pão francês e bolo de fubá hoje. Fresquinhos! Passa pela padaria mais tarde.',
    choices: [{ label: 'Ótimo, valeu!', next: null }],
  },
  friendly: {
    text: 'Que bom! A padaria fica mais alegre com visita. Volta sempre!',
    choices: [{ label: 'Com certeza!', next: null }],
  },
};

// ─── Tio Bento (farmer) ──────────────────────────────────────────────────────
const bento: DialogueTree = {
  start: {
    text: 'Hmm. Terra molhada cheira a progresso. O que te traz por aqui?',
    choices: [
      { label: 'Como vai a safra?', next: 'harvest' },
      { label: 'Só passando.', next: 'passing' },
      { label: 'Até mais.', next: null },
    ],
  },
  harvest: {
    text: 'Razoável. Trigo tá crescendo bem. Milho precisava de mais chuva, mas a gente não manda no céu.',
    choices: [{ label: 'Espero que melhore.', next: null }],
  },
  passing: {
    text: 'Tá bom. Campo não vai a lugar nenhum — se precisar de mim, é só chamar.',
    choices: [{ label: 'Obrigado.', next: null }],
  },
};

// ─── Lucia (rancher) ─────────────────────────────────────────────────────────
const lucia: DialogueTree = {
  start: {
    text: 'Oi! Os animais estão bem cuidados hoje. Precisando de algo?',
    choices: [
      { label: 'Como são os animais aqui?', next: 'animals' },
      { label: 'Só queria conversar.', next: 'chat' },
      { label: 'Até mais!', next: null },
    ],
  },
  animals: {
    text: 'Tenho vacas e ovelhas. As vacas dão leite todo dia, as ovelhas dão lã toda semana. São muito carinhosas, quer conhecer?',
    choices: [
      { label: 'Com prazer!', next: null },
      { label: 'Talvez depois.', next: null },
    ],
  },
  chat: {
    text: 'Que bom! É sempre bom ter uma boa conversa entre as tarefas. A fazenda fica mais animada.',
    choices: [{ label: 'Concordo! Até mais.', next: null }],
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Master map: npcId → dialogue tree.
 */
export const NPC_DIALOGUE_TREES: Record<string, DialogueTree> = {
  dorinha,
  marina,
  bento,
  lucia,
};

/**
 * Returns the starting node for a given NPC, or null if none.
 */
export function getStartNode(npcId: string): DialogueNode | null {
  return NPC_DIALOGUE_TREES[npcId]?.start ?? null;
}

/**
 * Returns a specific dialogue node, or null if not found.
 */
export function getDialogueNode(npcId: string, nodeId: string): DialogueNode | null {
  return NPC_DIALOGUE_TREES[npcId]?.[nodeId] ?? null;
}
