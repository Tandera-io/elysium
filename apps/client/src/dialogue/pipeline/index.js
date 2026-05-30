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

export const PLAYER_ACTIONS = Object.freeze({
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
// First-meeting lines — spoken the very first time the player meets an NPC.
// ---------------------------------------------------------------------------

const FIRST_MEETING_LINES = {
  ferraz: [
    'Ei, rosto novo! Bem-vindo à ferraria. Sou o Ferraz — se precisar de ferramenta boa ou upgrade, é aqui.',
    'Nunca te vi por aqui antes. O nome é Ferraz. Trabalho com metal desde os doze anos. O que precisa?',
    'Pode chegar, sem cerimônia. Ferraz, ferreiro. Se o seu equipamento estiver frouxo, eu resolvo.',
  ],
  nina: [
    'Olá! Eu sou Nina. Se precisar de ferramenta ou semente, pode contar comigo!',
    'Bem-vindo à ferragem! Sou Nina. Temos tudo que você precisa para a roça.',
    'Chegou em boa hora! Acabei de receber estoque novo. Eu sou Nina, é um prazer!',
  ],
  dorinha: [
    'Oi, oi! Sou a Dorinha, da quitanda. Se quiser comprar ou vender safra, é aqui!',
    'Olá! Nunca te vi por aqui. Sou a Dorinha. Pode chegar, temos sementes e compramos colheita!',
    'Bem-vindo! Sou Dorinha. Precisa de semente ou quer vender o que colheu? Pode falar!',
  ],
  marina: [
    'Que bom ver um rosto novo! Sou a Marina, da padaria. Se quiser pão fresquinho, é aqui!',
    'Olá, bem-vindo! Me chamo Marina. O cheirinho de pão quentinho veio até você, né?',
  ],
  bento: [
    'Hmm. Novo por aqui. Bento. Trabalho nessa terra faz tempo. Qualquer coisa, pode perguntar.',
    'Rosto novo. Sou o Bento. Se precisar de conselho sobre a roça, tô por aqui.',
  ],
  lucia: [
    'Oi! Sou a Lucia. Cuido dos animais por aqui. Se quiser saber sobre leite ou lã, pode me chamar!',
    'Bem-vindo! Lucia, criadora. Se precisar de produto animal, é comigo.',
  ],
};

// ---------------------------------------------------------------------------
// Repeat-visit lines — used when the player has talked before.
// ---------------------------------------------------------------------------

const REPEAT_VISIT_LINES = {
  ferraz: {
    repeat_early: [
      'De volta, hein? Vejo que gostou do serviço.',
      'Apareceu de novo. Tem mais alguma ferramenta pra consertar?',
      'Ei! Tá precisando de upgrade já?',
    ],
    repeat_regular: [
      'Sempre bom ver você por aqui. O que precisa hoje?',
      'Chegou na hora certa — acabei de afiar um lote novo.',
      'Fala, amigo. Ferramenta, upgrade ou papo sobre minério?',
    ],
    friend: [
      'Meu cliente favorito! Tô guardando um minério especial pra você.',
      'Você aparece mais do que meu próprio martelo. Brincadeira — o que vai ser hoje?',
      'Pensando bem, vou ter que te cobrar taxa de visita frequente. Brincadeira! O que precisa?',
    ],
  },
  nina: {
    repeat_early: [
      'Voltou! Precisando de mais ferramenta?',
      'Que bom te ver de novo! Tem novidade no estoque.',
    ],
    repeat_regular: [
      'Sempre bom te ver por aqui! O que precisa hoje?',
      'Chegou na hora — acabei de organizar o estoque.',
    ],
    friend: [
      'Amigo de sempre! Já separo o melhor pra você.',
      'Você é quase da família aqui na ferragem!',
    ],
  },
  dorinha: {
    repeat_early: [
      'Voltou! Quer vender mais ou comprar semente?',
      'Que bom! Vim na hora — tenho promoção hoje.',
    ],
    repeat_regular: [
      'Sempre um prazer! O que vai ser hoje?',
      'Olha quem apareceu! Tem safra nova?',
    ],
    friend: [
      'Meu cliente preferido! Vou fazer um preço especial.',
      'Você é praticamente sócio da quitanda já!',
    ],
  },
};

// ---------------------------------------------------------------------------
// Action-specific responses per NPC.
// ---------------------------------------------------------------------------

const ACTION_RESPONSES = {
  ferraz: {
    greet: [
      'Oi! Precisando de ferramenta ou upgrade?',
      'Olá! O que posso fazer pela sua roça hoje?',
      'Pode falar — tô aqui pra isso.',
    ],
    buy: [
      'Claro! Deixa eu te mostrar o que tenho disponível na ferraria.',
      'Boa escolha! Só trabalho com material de qualidade. Olha o que tenho aqui.',
      'Posso te mostrar o estoque — tudo forjado por mim.',
    ],
    sell: [
      'Minério bom eu sempre aceito. Que tipo você trouxe?',
      'Depende do material. Ferro e aço eu pago bem. O que tem?',
      'Se for matéria-prima de qualidade, a gente negocia.',
    ],
    give_gift: [
      'Minério raro? Cara, você sabe o caminho pro meu coração.',
      'Isso aqui é minério de boa qualidade! Obrigado de verdade.',
      'Não era necessário, mas vou guardar bem. Valeu!',
    ],
    upgrade: [
      'Deixa eu dar uma olhada. Essa ferramenta tem conserto sim.',
      'Trago ela amanhã pronta. Vai ficar melhor do que nova.',
      'Upgrade é comigo mesmo. Quanto tempo você tem?',
    ],
    talk: [
      'Sabe o que me apaixona nesse trabalho? Metal que você forja com as próprias mãos vira algo útil de verdade.',
      'Eu aprendi a ferraria com meu pai. Ele dizia: ferramenta ruim é pior que nenhuma.',
      'Minério bom é difícil de achar por aqui, mas quando encontro, vira obra de arte.',
      'Esse forno já forjou centenas de peças. Cada uma tem uma história.',
      'Trabalho com metal faz mais de vinte anos. Ainda me emociono quando uma peça sai perfeita.',
    ],
    quest_accept: [
      'Pode deixar. Se precisa de ferramenta forjada, eu faço.',
      'Combinado. Traz o material que eu cuido do resto.',
    ],
    quest_complete: [
      'Pronto! Ficou melhor do que esperava. Testa aí.',
      'Missão cumprida. Espero que sirva bem!',
    ],
    goodbye: [
      'Até mais! Volta quando precisar de upgrade.',
      'Cuida dessa ferramenta, hein! Tchau.',
      'Qualquer coisa, sabe onde me achar. Tchau!',
    ],
  },
  nina: {
    greet: ['Oi! Precisando de ferramenta ou semente?', 'Olá! O que posso fazer por você hoje?'],
    buy: [
      'Boa escolha! Dá uma olhada nas ferramentas.',
      'Pode escolher o que precisa — qualidade garantida.',
    ],
    sell: ['Não costumo comprar colheita, mas posso indicar a Dorinha!'],
    give_gift: ['Que gentileza! Obrigada!', 'Não precisava, mas fico feliz. Valeu!'],
    talk: [
      'Uma ferramenta bem conservada dura a vida toda.',
      'O Tio Bento é cliente fiel há anos. Homem de bom gosto!',
      'Eu mesma faço a manutenção das ferramentas do estoque.',
    ],
    quest_accept: ['Pode deixar comigo!', 'Combinado, farei o possível.'],
    quest_complete: ['Ótimo trabalho! Obrigada.', 'Missão cumprida! Muito bem.'],
    goodbye: ['Até mais! Volta quando precisar.', 'Tchau! Cuida das ferramentas.'],
  },
  dorinha: {
    greet: ['Oi! Quer comprar semente ou vender safra?', 'Olá! Temos novidades no estoque hoje!'],
    buy: ['Pode escolher à vontade — tudo fresquinho.', 'Boa escolha! Olha o que tenho aqui.'],
    sell: ['Comprando sim! Quanto você trouxe?', 'Ótima safra você tem! Quanto quer receber?'],
    give_gift: ['Que fofo! Obrigada!', 'Não era necessário, mas adorei. Valeu!'],
    talk: [
      'A melhor safra que vi foi do Bento — trigo que nem parecia real.',
      'A Marina é minha amiga de infância. A gente cresceu junto aqui.',
      'Tô com medo dessa concorrência da cidade, mas a gente se vira!',
    ],
    quest_accept: ['Pode contar comigo!', 'Combinado!'],
    quest_complete: ['Valeu demais! Muito obrigada.', 'Que alívio! Obrigada!'],
    goodbye: ['Até mais! Volta com safra boa!', 'Tchau! Boas colheitas!'],
  },
};

// ---------------------------------------------------------------------------
// Fallback responses when no NPC-specific line is found.
// ---------------------------------------------------------------------------

const FALLBACK_RESPONSES = {
  greet: ['Olá! Como posso ajudar?', 'Oi! O que precisa?'],
  buy: ['Claro! Veja o que tenho disponível.', 'Pode escolher.'],
  sell: ['Me conta o que você quer vender.'],
  give_gift: ['Obrigado pelo presente!', 'Que gentileza!'],
  talk: ['Hmm, interessante...', 'É assim mesmo por aqui.'],
  quest_accept: ['Pode contar comigo.', 'Combinado!'],
  quest_complete: ['Parabéns! Missão cumprida.', 'Muito bem!'],
  goodbye: ['Até mais!', 'Tchau!'],
  default: ['...', 'Hmm.'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick(arr, seed = 0) {
  if (!arr || arr.length === 0) return null;
  return arr[seed % arr.length];
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify the player–NPC relationship based on interaction history.
 *
 * @param {{ interactionCount?: number, heartLevel?: number }} context
 * @returns {'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'}
 */
export function classifyContext(context = {}) {
  const count = context.interactionCount ?? 0;
  const heart = context.heartLevel ?? 0;
  if (count <= 0) return 'first_meeting';
  if (heart >= 6 || count >= 20) return 'friend';
  if (count >= 5) return 'repeat_regular';
  return 'repeat_early';
}

/**
 * Return the first-meeting greeting for an NPC.
 *
 * @param {string} npcId
 * @param {number} [seed]
 * @returns {string}
 */
export function getFirstMeetingLine(npcId, seed = 0) {
  const lines = FIRST_MEETING_LINES[npcId];
  if (lines && lines.length > 0) return pick(lines, seed);
  return FALLBACK_RESPONSES.greet[0];
}

/**
 * Return a repeat-visit line appropriate for the current relationship stage.
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number, heartLevel?: number }} context
 * @returns {string}
 */
export function getRepeatVisitLine(npcId, context = {}) {
  const stage = classifyContext(context);
  if (stage === 'first_meeting') return getFirstMeetingLine(npcId);

  const npcRepeat = REPEAT_VISIT_LINES[npcId];
  if (npcRepeat) {
    const bucket = npcRepeat[stage] ?? npcRepeat['repeat_early'];
    if (bucket && bucket.length > 0) return pickRandom(bucket);
  }

  return FALLBACK_RESPONSES.greet[0];
}

/**
 * Return a single action-response string for an NPC + player action.
 *
 * @param {string} npcId
 * @param {string} playerAction  — one of PLAYER_ACTIONS values
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getActionResponse(npcId, playerAction, context = {}) {
  const stage = classifyContext(context);

  if (stage === 'first_meeting' && playerAction === PLAYER_ACTIONS.GREET) {
    return getFirstMeetingLine(npcId, context.interactionCount ?? 0);
  }

  const npcResponses = ACTION_RESPONSES[npcId];
  if (npcResponses) {
    const bucket = npcResponses[playerAction];
    if (bucket && bucket.length > 0) return pickRandom(bucket);
  }

  const fallback = FALLBACK_RESPONSES[playerAction] ?? FALLBACK_RESPONSES.default;
  return pickRandom(fallback) ?? '...';
}

/**
 * Trigger a full dialogue turn, returning an array of response strings
 * (currently always one element, but kept as array for future multi-line support).
 *
 * @param {string} npcId
 * @param {string} playerAction
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string[]}
 */
export function triggerDialogue(npcId, playerAction, context = {}) {
  return [getActionResponse(npcId, playerAction, context)];
}
