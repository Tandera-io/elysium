// apps/client/src/dialogue/pipeline/index.js
//
// Dialogue pipeline — maps player actions to contextual NPC responses.
//
// Exported surface:
//   triggerDialogue(npcId, playerAction, context?) → string[]
//   PLAYER_ACTIONS  — exhaustive list of action keys
//   getActionResponse(npcId, playerAction, context?) → string
//   getFirstMeetingLine(npcId) → string
//   getRepeatVisitLine(npcId, context) → string
//   classifyContext(context) → 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'

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

/** @typedef {'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend'} RelationshipTier */

/**
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
  ferraz: [
    'Bem? Precisa de algo consertado? Ou tá só olhando a forja? Qualquer um dos dois atrapalha.',
    'Não te vi por aqui antes. Me chamo Ferraz. Conserto, forjo e melhoro ferramentas. Preço justo, trabalho sério.',
  ],
};

const FALLBACK_FIRST_MEETING = [
  'Olá! Primeira vez que nos encontramos, não é? Prazer em te conhecer.',
  'Oi! Nunca te vi antes. Seja bem-vindo(a)!',
];

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
  ferraz: {
    repeat_early: [
      'De volta. Precisa de mais alguma coisa forjada?',
      'Voltou! Tô no meio de um trabalho, mas pode falar.',
    ],
    repeat_regular: [
      'Você aparece bastante por aqui. Boa. Ferramentas precisam de manutenção.',
      'De volta à ferraria. Já conheço o que você precisa.',
    ],
    friend: [
      'Você de novo. Ainda bem. Fiz algo especial que acho que vai te interessar.',
      'Ah, você. Tô quase terminando uma peça. Fica aí, vale a pena esperar.',
    ],
  },
};

const FALLBACK_REPEAT_VISIT = {
  repeat_early: ['Voltou! Pode falar o que precisa.', 'Que bom de novo por aqui.'],
  repeat_regular: ['Bom te ver de novo.', 'Sempre bem-vindo(a).'],
  friend: ['Oi, amigo(a)! Que saudade.', 'Que bom te ver!'],
};

/** @type {Record<string, Record<string, string[]>>} */
const ACTION_RESPONSES = {
  nina: {
    greet: [
      'Oi! Bem-vinda à ferragem. Em que posso ajudar?',
      'Que bom te ver! Tô com estoque novo essa semana.',
      'Olá! Precisa de ferramenta ou semente hoje?',
    ],
    buy: [
      'Ótima escolha! Ferramenta boa dura anos.',
      'Compra certa! Esse item vale cada centavo.',
      'Vai gostar, garanto. Qualidade é minha marca.',
    ],
    give_gift: [
      'Nossa, que delicadeza! Obrigada de coração.',
      'Que surpresa boa! Você não precisava.',
      'Que gentileza! Vou guardar isso com carinho.',
    ],
    harvest: [
      'Que safra linda! Você tem jeito pra lavoura.',
      'Boa colheita! Chegou na hora certa.',
      'Olha essa produção! Orgulho de te ver crescer aqui.',
    ],
    water: [
      'Tá cuidando bem das plantas, hein? Bom sinal.',
      'Rega todo dia — essa disciplina vai fazer diferença.',
    ],
    plant: [
      'Plantou bem? Prepara o solo antes, faz diferença.',
      'Boa hora pra plantar! Vai colher em breve.',
    ],
    talk: [
      'Falando nisso, tem coisa nova no estoque essa semana.',
      'Tô aqui. Pode perguntar o que quiser.',
    ],
    quest_accept: [
      'Que alívio! Contava com você mesmo.',
      'Obrigada por aceitar! Sei que você vai conseguir.',
    ],
    quest_complete: [
      'Incrível! Você é rápida! Muito obrigada.',
      'Perfeito! Exatamente o que precisava. Aqui sua recompensa!',
    ],
    goodbye: [
      'Até mais! Volta sempre.',
      'Tchau! Qualquer coisa tô aqui.',
      'Cuida da fazenda! Até logo.',
    ],
  },
  dorinha: {
    greet: [
      'Chegou na hora certa! Tô com muita coisa boa hoje.',
      'Ei! Bem-vindo à quitanda. O que você precisa?',
      'Oi! Você vem comprar ou vender hoje?',
    ],
    buy: [
      'Boa escolha! Esse sai bastante aqui.',
      'Excelente! Vai gostar do resultado na lavoura.',
      'Tô feliz com a sua escolha. Produto de primeira!',
    ],
    sell: [
      'Que safra bonita! Te pago na hora.',
      'Isso aqui tá fresco! Vou aceitar tudo.',
      'Produto bom é produto que vende rápido. Pago bem!',
    ],
    give_gift: [
      'Caramba, que gentileza! Muito obrigada!',
      'Você não precisava, mas adorei. Obrigada de verdade.',
    ],
    harvest: [
      'Que colheita farta! Quer vender pra mim?',
      'Nossa, quanto produto bom! A lavoura tá ótima.',
    ],
    water: [
      'Cuida bem dessas plantas! Elas vão te dar muito retorno.',
      'Rega frequente é o segredo. Você entende de lavoura.',
    ],
    plant: [
      'Plantou mais? Vai ter bastante pra vender em breve!',
      'Bom ritmo! A quitanda compra tudo que você produzir.',
    ],
    talk: [
      'Ah, é bom bater papo! A feira da semana que vem tá chegando.',
      'Conversando aqui com você enquanto cuido do estoque.',
    ],
    quest_accept: [
      'Sabia que podia contar com você! Obrigada.',
      'Ótimo! Me avisa quando tiver pronto.',
    ],
    quest_complete: [
      'Uau, tão rápido! Aqui seu pagamento, certinho.',
      'Perfeito! Exatamente o que precisava. Valeu mesmo!',
    ],
    goodbye: [
      'Até mais! Volta quando quiser.',
      'Tchau! Boas colheitas pra você.',
      'Vai com Deus! Tô aqui quando precisar.',
    ],
  },
  marina: {
    greet: [
      'Que bom te ver! O pão tá saindo do forno agora.',
      'Olá! Entra, entra. Tenho biscoito quentinho.',
      'Oi, querida! Chega perto, tô aqui na padaria.',
    ],
    buy: ['Peguei com amor! Espero que goste.', 'Fiz tudo fresquinho hoje. Bom apetite!'],
    give_gift: [
      'Ai, que coisa mais linda! Obrigada, meu bem.',
      'Você tem um coração tão bom. Muito obrigada!',
    ],
    harvest: [
      'Que safra abençoada! Deus é bom.',
      'Olha essa produção! Você trabalha muito, parabéns.',
    ],
    talk: [
      'Fico feliz de conversar. A padaria às vezes é solitária.',
      'Tô aqui, pode falar. Amasso o pão e escuto.',
    ],
    quest_accept: [
      'Nossa, que alívio! Obrigada de coração.',
      'Sabia que você ia ajudar. Que bênção!',
    ],
    quest_complete: [
      'Perfeito! Obrigada, você não imagina o quanto me ajudou.',
      'Ai, que maravilha! Vai ser muito útil. Aqui sua recompensa.',
    ],
    goodbye: [
      'Tchau, meu bem! Passa lá em casa quando quiser.',
      'Até mais! Vai com Deus.',
      'Cuida bem da fazenda! Volte sempre.',
    ],
  },
  bento: {
    greet: [
      'Ei. Precisando de algo na fazenda?',
      'O que foi? Tô ocupado, pode falar.',
      'Bom dia. Tem produto novo no depósito.',
    ],
    buy: [
      'Bom. Ferramenta certa resolve metade do trabalho.',
      'Escolheu bem. Esse aqui é robusto.',
    ],
    sell: ['Produto bom. Pago o combinado.', 'Deixa eu ver. Isso aqui tá no ponto.'],
    give_gift: ['Ih. Não precisava, mas obrigado.', 'Tá bom. Aprecio.'],
    harvest: ['Boa colheita. Continua assim.', 'Isso, vai colhendo tudo. Não deixa estragar.'],
    water: ['Rega certa é metade do trabalho feito.', 'Bom. Planta que não bebe não cresce.'],
    plant: ['Preparou o solo direito antes? É importante.', 'Bom ritmo de plantio. Continua.'],
    talk: ['Pode falar. Tô aqui.', 'O que quer saber?'],
    quest_accept: ['Bom. Esperava isso de você.', 'Tá. Pode ir. Conheço seu trabalho.'],
    quest_complete: ['Feito direitinho. Aqui o combinado.', 'Rápido. Gosto disso. Aqui sua parte.'],
    goodbye: ['Tá. Até mais.', 'Vai lá. Muito trabalho ainda.'],
  },
  lucia: {
    greet: [
      'Olá! Só um segundo, tô com os animais.',
      'Oi! Que bom que veio. Os bichos tão bem hoje.',
      'Chegou na hora — tô terminando de alimentar o gado.',
    ],
    buy: ['Obrigada! Produtos fresquinhos do dia.', 'Produto de qualidade, pode confiar.'],
    give_gift: ['Ai, que fofo! Obrigada de verdade.', 'Que delicadeza sua! Fico feliz.'],
    harvest: [
      'Que colheita boa! Seus animais vão amar esse trato.',
      'Olha essa produção! A fazenda tá florescendo.',
    ],
    talk: [
      'Conversar enquanto cuido dos bichos é minha parte favorita do dia.',
      'Pode falar. Os animais adoram escutar também.',
    ],
    quest_accept: [
      'Obrigada! Sabia que você ia ajudar.',
      'Que alívio! Os animais agradecem também.',
    ],
    quest_complete: [
      'Que maravilha! Obrigada, você salvou o dia.',
      'Perfeito! Exatamente o que precisava. Aqui sua recompensa.',
    ],
    goodbye: [
      'Tchau! Os bichos mandam beijo.',
      'Até mais! Passa pra ver os animais quando quiser.',
    ],
  },
  ferraz: {
    greet: [
      'Ei. Precisa de algo forjado ou tá só olhando?',
      'O que foi? Tô no meio de um trabalho, mas pode falar.',
      'Bom dia. Tem peça nova saindo do forno hoje.',
    ],
    buy: [
      'Boa escolha. Esse aqui durou mais que a maioria dos meus clientes.',
      'Escolheu bem. Forjei com ferro de qualidade.',
      'Bom. Ferramenta certa poupa metade do esforço.',
    ],
    sell: [
      'Minério bom. Pago o combinado.',
      'Isso aqui tem qualidade. Posso usar no próximo lote.',
    ],
    give_gift: [
      'Minério? Isso sim é presente útil. Obrigado.',
      'Não esperava isso. Mas aprecio. Vou usar bem.',
      'Hm. Obrigado. Não sou de receber presente, mas esse faz sentido.',
    ],
    harvest: [
      'Boa colheita. Você trabalha duro — respeito isso.',
      'Tá indo bem na fazenda. Bom. Trabalhador merece ferramentas boas.',
    ],
    water: [
      'Cuida das plantas como eu cuido das ferramentas. Bom hábito.',
      'Disciplina. É o que separa quem progride de quem fica pra trás.',
    ],
    plant: [
      'Plantando mais? Vai precisar de ferramenta boa pra colher tudo isso.',
      'Bom ritmo. Continua assim.',
    ],
    talk: [
      'Pode falar. Tô aqui enquanto o ferro esfria.',
      'O que quer saber? Ferramenta, minério, forja — pode perguntar.',
    ],
    quest_accept: [
      'Bom. Sabia que você ia aceitar. Conheço trabalhador quando vejo.',
      'Tá. Pode ir. Não decepcione.',
    ],
    quest_complete: [
      'Feito e entregue. Aqui o combinado. Trabalho honesto merece pagamento honesto.',
      'Rápido e bem feito. Gosto disso. Aqui sua parte.',
    ],
    goodbye: [
      'Tá. Até mais. Volta quando precisar.',
      'Vai lá. Ainda tenho muito trabalho.',
      'Tchau. A forja não para — nem eu.',
    ],
  },
};

const FALLBACK_RESPONSES = {
  greet: ['Olá! Como posso ajudar?', 'Oi! Bem-vindo.'],
  buy: ['Boa escolha!', 'Ótimo negócio.'],
  sell: ['Produto bom. Obrigado.'],
  give_gift: ['Obrigado pelo presente!', 'Que gentileza!'],
  harvest: ['Boa colheita!', 'Muito bom!'],
  water: ['Continua cuidando bem.'],
  plant: ['Bom plantio!'],
  talk: ['Pode falar.', 'Tô aqui.'],
  quest_accept: ['Obrigado por aceitar!'],
  quest_complete: ['Muito obrigado! Aqui sua recompensa.'],
  goodbye: ['Até mais!', 'Tchau!'],
};

/**
 * @param {string[]} arr
 * @param {number} seed
 * @returns {string}
 */
function pick(arr, seed = 0) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.abs(seed) % arr.length];
}

/**
 * @param {string} npcId
 * @param {number} [seed]
 * @returns {string}
 */
export function getFirstMeetingLine(npcId, seed = 0) {
  const lines = FIRST_MEETING_LINES[npcId] ?? FALLBACK_FIRST_MEETING;
  return pick(lines, seed);
}

/**
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

/**
 * @param {string} npcId
 * @param {string} playerAction
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string}
 */
export function getActionResponse(npcId, playerAction, context = {}) {
  const seed = context.interactionCount ?? 0;
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
 * @param {string} npcId
 * @param {string} playerAction
 * @param {{ interactionCount?: number, heartLevel?: number }} [context]
 * @returns {string[]}
 */
export function triggerDialogue(npcId, playerAction, context = {}) {
  return [getActionResponse(npcId, playerAction, context)];
}
