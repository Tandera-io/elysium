// apps/client/src/dialogue/pipeline/index.js
//
// Dialogue pipeline — maps player actions to contextual NPC responses.
//
// When ANTHROPIC_API_KEY is absent the server falls back to hand-written
// responses; this client-side module provides the same fallback so NPCs
// always react even in fully-offline play.
//
// Exported surface:
//   triggerDialogue(npcId, playerAction, context?) → string[]
//   PLAYER_ACTIONS  — exhaustive list of action keys
//   getActionResponse(npcId, playerAction, context?) → string
//   getFirstMeetingLine(npcId) → string
//   getRepeatVisitLine(npcId, context) → string
//   classifyContext(context) → 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'

// ---------------------------------------------------------------------------
// Known player actions
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
export const PLAYER_ACTIONS = /** @type {const} */ ({
  GREET: 'greet',
  BUY: 'buy',
  SELL: 'sell',
  GIVE_GIFT: 'give_gift',
  HARVEST: 'harvest',
  WATER: 'water',
  PLANT: 'plant',
  TALK: 'talk',
  QUEST_ACCEPT: 'quest_accept',
  QUEST_COMPLETE: 'quest_complete',
  GOODBYE: 'goodbye',
});

// ---------------------------------------------------------------------------
// Relationship context thresholds
// ---------------------------------------------------------------------------

/** @typedef {'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'} RelationshipTier */

/**
 * Classify a player-NPC relationship into a tier based on interaction count
 * and heart level.
 *
 * @param {{ interactionCount?: number, heartLevel?: number }} context
 * @returns {RelationshipTier}
 */
export function classifyContext(context = {}) {
  const count = context.interactionCount ?? 0;
  const heart = context.heartLevel ?? 0;

  if (count <= 0) return 'first_meeting';
  if (heart >= 6 || count >= 20) return 'friend';
  if (count >= 5) return 'repeat_regular';
  return 'repeat_early';
}

// ---------------------------------------------------------------------------
// First-meeting lines — spoken when the player interacts for the very
// first time.  These are more formal/introductory in tone.
// ---------------------------------------------------------------------------

/** @type {Record<string, string[]>} */
const FIRST_MEETING_LINES = {
  nina: [
    'Ah, você é nova por aqui? Seja bem-vinda! Sou a Nina, tenho a melhor ferragem da região.',
    'Olá! Nunca te vi antes. Pode chamar de Nina. Aqui você acha ferramenta boa pra lavoura.',
  ],
  dorinha: [
    'Oi! Primeiro dia por aqui? Me chamo Dorinha, tenho a quitanda. Seja bem-vinda!',
    'Nossa, você chegou na hora certa! Sou a Dorinha. Compro e vendo tudo que a terra produz.',
  ],
  marina: [
    'Que prazer! Nunca te vi por aqui. Sou a Marina, faço o pão mais gostoso do vilarejo!',
    'Oi, querida! Sou a Marina da padaria. Entre, o forno tá quentinho e o café tá pronto.',
  ],
  bento: [
    'Hmm. Rosto novo. Me chamo Bento. Tenho suprimentos de fazenda. Preço justo, sem enrolação.',
    'Nova por aqui? Sou o Bento. Tenho tudo que a fazenda precisa. Pode confiar.',
  ],
  lucia: [
    'Oh! Você é a novata! Me chamo Lucia. Cuido dos animais por aqui. Pode perguntar o que quiser!',
    'Oi! Primeira vez que nos encontramos, né? Sou a Lucia. Qualquer dúvida sobre gado ou aves, fala comigo.',
  ],
};

const FALLBACK_FIRST_MEETING = [
  'Olá! Primeira vez que nos encontramos, não é? Prazer em te conhecer.',
  'Oi! Nunca te vi antes. Seja bem-vindo(a)!',
];

// ---------------------------------------------------------------------------
// Repeat-visit lines — context-sensitive greetings for returning players.
// Keyed: npcId → tier → lines[]
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, string[]>>} */
const REPEAT_VISIT_LINES = {
  nina: {
    repeat_early: [
      'Voltou! Tô com novidade no estoque essa semana.',
      'De volta à ferragem! Precisando de mais alguma coisa?',
    ],
    repeat_regular: [
      'Boa te ver de novo. Já conhece bem o estoque né?',
      'Sempre um prazer atender você. Tô com produto bom essa semana.',
    ],
    friend: [
      'Ei, amiga! Já tava com saudades. Tô guardando aquela ferramenta especial pra você.',
      'Que bom! Já fica difícil de trabalhar quando você some por muito tempo.',
    ],
  },
  dorinha: {
    repeat_early: [
      'Voltou! Que bom. Tô com safra nova hoje.',
      'De volta à quitanda! Trouxe mais coisa pra vender?',
    ],
    repeat_regular: [
      'Sempre bom te ver por aqui. Safra tá boa essa semana.',
      'De volta! Meu estoque agradece a visita frequente.',
    ],
    friend: [
      'Amiga! Já separei uma coisa especial pra você. Entra!',
      'Finalmente! Tava esperando você. Tem oferta boa hoje.',
    ],
  },
  marina: {
    repeat_early: [
      'De volta! Tenho pão fresquinho esperando por você.',
      'Que bom te ver de novo! Fiz biscoito hoje, tá quentinho ainda.',
    ],
    repeat_regular: [
      'Já virou rotina essa sua visita, e eu adoro! Tem café passado.',
      'Que saudade! Sabia que você ia aparecer hoje.',
    ],
    friend: [
      'Meu bem! Já tava com saudade. Fiz aquele bolo de fubá que você gosta.',
      'Entre, entre! Você é como da família aqui na padaria.',
    ],
  },
  bento: {
    repeat_early: ['De volta. O que precisa agora?', 'Hmm. Voltou. Tem coisa nova no depósito.'],
    repeat_regular: [
      'Voltou de novo. Boa. Sei o que você precisa.',
      'Conheço seus gostos já. Tem produto bom aqui.',
    ],
    friend: [
      'Sempre pontual. Isso eu gosto.',
      'Ah. Você de novo. Não reclamo, você sabe trabalhar.',
    ],
  },
  lucia: {
    repeat_early: [
      'De volta! Os animais ficam animados quando você aparece.',
      'Voltou! Que bom. Os bichos sentiram falta.',
    ],
    repeat_regular: [
      'Já virou visita certa essa sua! Os animais já te conhecem.',
      'Sempre que você vem os bichos ficam mais alegres. Já notei.',
    ],
    friend: [
      'Amiga dos meus bichos! Eles me cobram quando você some muito.',
      'Que bom te ver! Tenho coisinhas novas pra mostrar, fica animado!',
    ],
  },
};

const FALLBACK_REPEAT_VISIT = {
  repeat_early: ['Voltou! Pode falar o que precisa.', 'Que bom de novo por aqui.'],
  repeat_regular: ['Bom te ver de novo.', 'Sempre bem-vindo(a).'],
  friend: ['Oi, amigo(a)! Que saudade.', 'Que bom te ver!'],
};

// ---------------------------------------------------------------------------
// Hand-authored action responses per NPC
// Keyed: npcId → playerAction → responses[]
// A random entry is selected so repeated interactions feel varied.
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, string[]>>} */
const ACTION_RESPONSES = {
  nina: {
    [PLAYER_ACTIONS.GREET]: [
      'Oi! Bem-vinda à ferragem. Em que posso ajudar?',
      'Que bom te ver! Tô com estoque novo essa semana.',
      'Olá! Precisa de ferramenta ou semente hoje?',
    ],
    [PLAYER_ACTIONS.BUY]: [
      'Ótima escolha! Ferramenta boa dura anos.',
      'Compra certa! Esse item vale cada centavo.',
      'Vai gostar, garanto. Qualidade é minha marca.',
    ],
    [PLAYER_ACTIONS.GIVE_GIFT]: [
      'Nossa, que delicadeza! Obrigada de coração.',
      'Que surpresa boa! Você não precisava.',
      'Que gentileza! Vou guardar isso com carinho.',
    ],
    [PLAYER_ACTIONS.HARVEST]: [
      'Que safra linda! Você tem jeito pra lavoura.',
      'Boa colheita! Chegou na hora certa.',
      'Olha essa produção! Orgulho de te ver crescer aqui.',
    ],
    [PLAYER_ACTIONS.WATER]: [
      'Tá cuidando bem das plantas, hein? Bom sinal.',
      'Rega todo dia — essa disciplina vai fazer diferença.',
    ],
    [PLAYER_ACTIONS.PLANT]: [
      'Plantou bem? Prepara o solo antes, faz diferença.',
      'Boa hora pra plantar! Vai colher em breve.',
    ],
    [PLAYER_ACTIONS.TALK]: [
      'Falando nisso, tem coisa nova no estoque essa semana.',
      'Tô aqui. Pode perguntar o que quiser.',
    ],
    [PLAYER_ACTIONS.QUEST_ACCEPT]: [
      'Que alívio! Contava com você mesmo.',
      'Obrigada por aceitar! Sei que você vai conseguir.',
    ],
    [PLAYER_ACTIONS.QUEST_COMPLETE]: [
      'Incrível! Você é rápida! Muito obrigada.',
      'Perfeito! Exatamente o que precisava. Aqui sua recompensa!',
    ],
    [PLAYER_ACTIONS.GOODBYE]: [
      'Até mais! Volta sempre.',
      'Tchau! Qualquer coisa tô aqui.',
      'Cuida da fazenda! Até logo.',
    ],
  },

  dorinha: {
    [PLAYER_ACTIONS.GREET]: [
      'Chegou na hora certa! Tô com muita coisa boa hoje.',
      'Ei! Bem-vindo à quitanda. O que você precisa?',
      'Oi! Você vem comprar ou vender hoje?',
    ],
    [PLAYER_ACTIONS.BUY]: [
      'Boa escolha! Esse sai bastante aqui.',
      'Excelente! Vai gostar do resultado na lavoura.',
      'Tô feliz com a sua escolha. Produto de primeira!',
    ],
    [PLAYER_ACTIONS.SELL]: [
      'Que safra bonita! Te pago na hora.',
      'Isso aqui tá fresco! Vou aceitar tudo.',
      'Produto bom é produto que vende rápido. Pago bem!',
    ],
    [PLAYER_ACTIONS.GIVE_GIFT]: [
      'Caramba, que gentileza! Muito obrigada!',
      'Você não precisava, mas adorei. Obrigada de verdade.',
    ],
    [PLAYER_ACTIONS.HARVEST]: [
      'Que colheita farta! Quer vender pra mim?',
      'Nossa, quanto produto bom! A lavoura tá ótima.',
    ],
    [PLAYER_ACTIONS.WATER]: [
      'Cuida bem dessas plantas! Elas vão te dar muito retorno.',
      'Rega frequente é o segredo. Você entende de lavoura.',
    ],
    [PLAYER_ACTIONS.PLANT]: [
      'Plantou mais? Vai ter bastante pra vender em breve!',
      'Bom ritmo! A quitanda compra tudo que você produzir.',
    ],
    [PLAYER_ACTIONS.TALK]: [
      'Ah, é bom bater papo! A feira da semana que vem tá chegando.',
      'Conversando aqui com você enquanto cuido do estoque.',
    ],
    [PLAYER_ACTIONS.QUEST_ACCEPT]: [
      'Sabia que podia contar com você! Obrigada.',
      'Ótimo! Me avisa quando tiver pronto.',
    ],
    [PLAYER_ACTIONS.QUEST_COMPLETE]: [
      'Uau, tão rápido! Aqui seu pagamento, certinho.',
      'Perfeito! Exatamente o que precisava. Valeu mesmo!',
    ],
    [PLAYER_ACTIONS.GOODBYE]: [
      'Até mais! Volta quando quiser.',
      'Tchau! Boas colheitas pra você.',
      'Vai com Deus! Tô aqui quando precisar.',
    ],
  },

  marina: {
    [PLAYER_ACTIONS.GREET]: [
      'Que bom te ver! O pão tá saindo do forno agora.',
      'Olá! Entra, entra. Tenho biscoito quentinho.',
      'Oi, querida! Chega perto, tô aqui na padaria.',
    ],
    [PLAYER_ACTIONS.BUY]: [
      'Peguei com amor! Espero que goste.',
      'Fiz tudo fresquinho hoje. Bom apetite!',
    ],
    [PLAYER_ACTIONS.GIVE_GIFT]: [
      'Ai, que coisa mais linda! Obrigada, meu bem.',
      'Você tem um coração tão bom. Muito obrigada!',
    ],
    [PLAYER_ACTIONS.HARVEST]: [
      'Que safra abençoada! Deus é bom.',
      'Olha essa produção! Você trabalha muito, parabéns.',
    ],
    [PLAYER_ACTIONS.TALK]: [
      'Fico feliz de conversar. A padaria às vezes é solitária.',
      'Tô aqui, pode falar. Amasso o pão e escuto.',
    ],
    [PLAYER_ACTIONS.QUEST_ACCEPT]: [
      'Nossa, que alívio! Obrigada de coração.',
      'Sabia que você ia ajudar. Que bênção!',
    ],
    [PLAYER_ACTIONS.QUEST_COMPLETE]: [
      'Perfeito! Obrigada, você não imagina o quanto me ajudou.',
      'Ai, que maravilha! Vai ser muito útil. Aqui sua recompensa.',
    ],
    [PLAYER_ACTIONS.GOODBYE]: [
      'Tchau, meu bem! Passa lá em casa quando quiser.',
      'Até mais! Vai com Deus.',
      'Cuida bem da fazenda! Volte sempre.',
    ],
  },

  bento: {
    [PLAYER_ACTIONS.GREET]: [
      'Ei. Precisando de algo na fazenda?',
      'O que foi? Tô ocupado, pode falar.',
      'Bom dia. Tem produto novo no depósito.',
    ],
    [PLAYER_ACTIONS.BUY]: [
      'Bom. Ferramenta certa resolve metade do trabalho.',
      'Escolheu bem. Esse aqui é robusto.',
    ],
    [PLAYER_ACTIONS.SELL]: [
      'Produto bom. Pago o combinado.',
      'Deixa eu ver. Isso aqui tá no ponto.',
    ],
    [PLAYER_ACTIONS.GIVE_GIFT]: ['Ih. Não precisava, mas obrigado.', 'Tá bom. Aprecio.'],
    [PLAYER_ACTIONS.HARVEST]: [
      'Boa colheita. Continua assim.',
      'Isso, vai colhendo tudo. Não deixa estragar.',
    ],
    [PLAYER_ACTIONS.WATER]: [
      'Rega certa é metade do trabalho feito.',
      'Bom. Planta que não bebe não cresce.',
    ],
    [PLAYER_ACTIONS.PLANT]: [
      'Preparou o solo direito antes? É importante.',
      'Bom ritmo de plantio. Continua.',
    ],
    [PLAYER_ACTIONS.TALK]: ['Pode falar. Tô aqui.', 'O que quer saber?'],
    [PLAYER_ACTIONS.QUEST_ACCEPT]: [
      'Bom. Esperava isso de você.',
      'Tá. Pode ir. Conheço seu trabalho.',
    ],
    [PLAYER_ACTIONS.QUEST_COMPLETE]: [
      'Feito direitinho. Aqui o combinado.',
      'Rápido. Gosto disso. Aqui sua parte.',
    ],
    [PLAYER_ACTIONS.GOODBYE]: ['Tá. Até mais.', 'Vai lá. Muito trabalho ainda.'],
  },

  lucia: {
    [PLAYER_ACTIONS.GREET]: [
      'Olá! Só um segundo, tô com os animais.',
      'Oi! Que bom que veio. Os bichos tão bem hoje.',
      'Chegou na hora — tô terminando de alimentar o gado.',
    ],
    [PLAYER_ACTIONS.BUY]: [
      'Obrigada! Produtos fresquinhos do dia.',
      'Produto de qualidade, pode confiar.',
    ],
    [PLAYER_ACTIONS.GIVE_GIFT]: [
      'Ai, que fofo! Obrigada de verdade.',
      'Que delicadeza sua! Fico feliz.',
    ],
    [PLAYER_ACTIONS.HARVEST]: [
      'Que colheita boa! Seus animais vão amar esse trato.',
      'Olha essa produção! A fazenda tá florescendo.',
    ],
    [PLAYER_ACTIONS.TALK]: [
      'Conversar enquanto cuido dos bichos é minha parte favorita do dia.',
      'Pode falar. Os animais adoram escutar também.',
    ],
    [PLAYER_ACTIONS.QUEST_ACCEPT]: [
      'Obrigada! Sabia que você ia ajudar.',
      'Que alívio! Os animais agradecem também.',
    ],
    [PLAYER_ACTIONS.QUEST_COMPLETE]: [
      'Que maravilha! Obrigada, você salvou o dia.',
      'Perfeito! Exatamente o que precisava. Aqui sua recompensa.',
    ],
    [PLAYER_ACTIONS.GOODBYE]: [
      'Tchau! Os bichos mandam beijo.',
      'Até mais! Passa pra ver os animais quando quiser.',
    ],
  },
};

// Fallback for NPCs without specific responses
const FALLBACK_RESPONSES = {
  [PLAYER_ACTIONS.GREET]: ['Olá! Como posso ajudar?', 'Oi! Bem-vindo.'],
  [PLAYER_ACTIONS.BUY]: ['Boa escolha!', 'Ótimo negócio.'],
  [PLAYER_ACTIONS.SELL]: ['Produto bom. Obrigado.'],
  [PLAYER_ACTIONS.GIVE_GIFT]: ['Obrigado pelo presente!', 'Que gentileza!'],
  [PLAYER_ACTIONS.HARVEST]: ['Boa colheita!', 'Muito bom!'],
  [PLAYER_ACTIONS.WATER]: ['Continua cuidando bem.'],
  [PLAYER_ACTIONS.PLANT]: ['Bom plantio!'],
  [PLAYER_ACTIONS.TALK]: ['Pode falar.', 'Tô aqui.'],
  [PLAYER_ACTIONS.QUEST_ACCEPT]: ['Obrigado por aceitar!'],
  [PLAYER_ACTIONS.QUEST_COMPLETE]: ['Muito obrigado! Aqui sua recompensa.'],
  [PLAYER_ACTIONS.GOODBYE]: ['Até mais!', 'Tchau!'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a pseudo-random element from an array using interaction count as seed
 * so the same action at the same visit returns the same line (deterministic
 * within a session) but varies across visits.
 *
 * @param {string[]} arr
 * @param {number} seed
 * @returns {string}
 */
function pick(arr, seed = 0) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.abs(seed) % arr.length];
}

// ---------------------------------------------------------------------------
// Context-aware opening lines
// ---------------------------------------------------------------------------

/**
 * Returns the first-meeting line for an NPC.
 *
 * @param {string} npcId
 * @param {number} [seed]
 * @returns {string}
 */
export function getFirstMeetingLine(npcId, seed = 0) {
  const lines = FIRST_MEETING_LINES[npcId] ?? FALLBACK_FIRST_MEETING;
  return pick(lines, seed);
}

/**
 * Returns a repeat-visit greeting based on relationship tier.
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getRepeatVisitLine(npcId, context = {}) {
  const tier = classifyContext(context);
  if (tier === 'first_meeting') return getFirstMeetingLine(npcId, 0);

  const npcLines = REPEAT_VISIT_LINES[npcId];
  const lines = npcLines?.[tier] ?? FALLBACK_REPEAT_VISIT[tier] ?? ['Oi!'];
  return pick(lines, context.interactionCount ?? 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a single NPC response line for a player action.
 * For the GREET action, automatically uses context-sensitive opening lines
 * (first meeting vs. repeat visit).
 *
 * @param {string} npcId          — e.g. 'nina', 'dorinha'
 * @param {string} playerAction   — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getActionResponse(npcId, playerAction, context = {}) {
  const seed = context.interactionCount ?? 0;

  // For greetings, prefer context-sensitive opening lines.
  if (playerAction === PLAYER_ACTIONS.GREET) {
    const tier = classifyContext(context);
    if (tier === 'first_meeting') return getFirstMeetingLine(npcId, seed);
    return getRepeatVisitLine(npcId, context);
  }

  const npcResponses = ACTION_RESPONSES[npcId];
  const lines = npcResponses?.[playerAction] ?? FALLBACK_RESPONSES[playerAction] ?? ['Hmm.'];
  return pick(lines, seed);
}

/**
 * Returns an array of dialogue lines (currently one line) for a player
 * action. Future versions may return multi-line sequences.
 *
 * @param {string} npcId
 * @param {string} playerAction
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string[]}
 */
export function triggerDialogue(npcId, playerAction, context = {}) {
  return [getActionResponse(npcId, playerAction, context)];
}
