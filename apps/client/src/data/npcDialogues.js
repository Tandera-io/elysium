// apps/client/src/data/npcDialogues.js
//
// NPC dialogue data — structured conversation content for brief multi-turn
// interactions between the player and each villager.
//
// Exported surface:
//   NPC_IDS                          — array of all NPC id strings
//   CONVERSATION_FLOWS               — Record<npcId, Array<Flow>>
//   getConversationFlow(npcId, text) — find matching flow line from player text
//   NPC_CONVERSATIONS                — metadata per NPC (openingLine, closingLine, flows)

// ---------------------------------------------------------------------------
// Types (JSDoc only)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ trigger: string[], lines: string[] }} ConversationFlow
 * A flow matches when any word in `trigger` appears in lowercased player text.
 * One of `lines` is returned as the NPC response.
 */

// ---------------------------------------------------------------------------
// NPC IDs
// ---------------------------------------------------------------------------

/** @type {string[]} */
export const NPC_IDS = ['nina', 'dorinha', 'marina', 'bento', 'lucia', 'ferraz'];

// ---------------------------------------------------------------------------
// Conversation flows per NPC
// Each flow: { trigger: string[], lines: string[] }
// ---------------------------------------------------------------------------

/** @type {Record<string, ConversationFlow[]>} */
export const CONVERSATION_FLOWS = {
  nina: [
    {
      trigger: ['comprar', 'estoque', 'tem', 'ferramenta', 'vender'],
      lines: [
        'Claro! Tenho regador, enxada e adubo em estoque. O que você precisa?',
        'Essa semana tô com um lote bom de ferramentas. Tudo de qualidade!',
        'Pode escolher à vontade. Preço justo e produto bom, é a minha marca.',
      ],
    },
    {
      trigger: ['semente', 'sementes', 'plantar', 'abóbora', 'morango'],
      lines: [
        'Tenho sementes de abóbora e morango. Ótimas para essa época do ano!',
        'As sementes chegaram fresquinhas essa semana. Vai colher muito!',
        'Sementes de morango são as que mais vendem agora. Tô com bastante estoque.',
      ],
    },
    {
      trigger: ['bento', 'tio', 'fazendeiro'],
      lines: [
        'O Tio Bento? É um cliente fiel! Compra ferramenta toda semana.',
        'Ah, o Bento! A gente se conhece de longa data. Homem sério, gosta de qualidade.',
        'O Bento passou aqui cedo. Disse que precisava de adubo especial.',
      ],
    },
    {
      trigger: ['manutenção', 'consertar', 'afilar', 'enferrujar', 'ferrugem'],
      lines: [
        'Boa pergunta! Mantenha a enxada seca depois de usar. Óleo leve no cabo evita rachar.',
        'Regador tem que ser esvaziado ao fim do dia. Água parada enferruja por dentro.',
        'Traga aqui que a gente dá uma olhada. Conserto rápido é melhor que ferramenta nova.',
      ],
    },
    {
      trigger: ['tempo', 'clima', 'chuva', 'sol', 'seca'],
      lines: [
        'Esse tempo seco tá complicado pra lavoura. Regador vai ser essencial!',
        'Parece que chuva vem aí. Bom pro campo, ruim pra ferramentas ao ar livre.',
        'Tô de olho no céu. Quando chove muito, as raízes sofrem. Vê se tem drenagem boa.',
      ],
    },
    {
      trigger: ['dica', 'conselho', 'ajuda', 'como', 'melhor'],
      lines: [
        'Dica de ouro: prepare o solo antes de plantar. Enxada boa no chão correto faz toda diferença.',
        'Regue cedo de manhã. A planta absorve melhor e o sol não queima as folhas molhadas.',
        'Composta é o segredo. Mistura com a terra uma semana antes de plantar.',
      ],
    },
    {
      trigger: ['negócio', 'movimento', 'ferragem', 'loja'],
      lines: [
        'Movimento tá bom essa semana! A temporada de plantio ajuda muito.',
        'A ferragem vai bem, graças a Deus. Muita gente começando a plantar agora.',
        'Tô feliz com o negócio. Cada cliente que volta é sinal que estou fazendo certo.',
      ],
    },
  ],

  dorinha: [
    {
      trigger: ['comprar', 'semente', 'sementes', 'preço'],
      lines: [
        'Tenho trigo, tomate e milho. Qual você quer?',
        'Preços bons essa semana! Sementes de trigo estão em promoção.',
        'Acabou de chegar um lote novo de sementes. Bem fresquinhas!',
      ],
    },
    {
      trigger: ['vender', 'colheita', 'safra', 'trigo', 'tomate', 'milho'],
      lines: [
        'Compro tudo que você trouxer! Trago o melhor preço da região.',
        'Que safra boa! Tô pagando bem essa semana, aproveita.',
        'Você veio na hora certa. Tô precisando de produto pra reabastecer.',
      ],
    },
    {
      trigger: ['marina', 'padaria', 'pão'],
      lines: [
        'A Marina? A gente cresceu juntas aqui no vilarejo. Melhor amiga que tenho!',
        'A padaria dela é a melhor que já vi. Pão de manhã cedo é sempre fresco.',
        'Conheço a Marina há anos. Ela usa minha farinha pra fazer o pão dela.',
      ],
    },
    {
      trigger: ['desconto', 'especial', 'amigo', 'barato'],
      lines: [
        'Pra você faço um precinho especial, sim! Você é um bom cliente.',
        'Ah, vai com Deus! Leva mais e te faço um desconto.',
        'Sabe que não costumo dar desconto... mas pra você, tudo bem. Aproveita!',
      ],
    },
    {
      trigger: ['plantar', 'plantar', 'época', 'temporada', 'estação'],
      lines: [
        'Agora é boa época pra plantar tomate. Vai colher em umas duas semanas!',
        'Trigo é bom o ano todo, mas milho prefere o verão. Te recomendo tomate agora.',
        'O que vale mais a pena plantar depende do que você quer vender. Tomate tá em alta!',
      ],
    },
    {
      trigger: ['cidade', 'concorrência', 'mercado', 'grande'],
      lines: [
        'Cidade grande não tem o calor humano que a gente tem aqui. Meus clientes voltam sempre.',
        'Já me perguntei isso. Mas a qualidade e o relacionamento fazem a diferença.',
        'A cidade tem tudo, mas não tem a Dorinha! Eles não sabem o que estão perdendo.',
      ],
    },
    {
      trigger: ['tempo', 'clima', 'chuva', 'sol'],
      lines: [
        'Esse sol forte hoje vai secar a plantação rápido. Mais água pras suas plantas!',
        'Previsão de chuva pra semana. Ótimo pra colheita, mas guarda o que tiver cortado.',
        'Tempo bom é sinal de colheita boa. Vai ser uma semana animada aqui na quitanda!',
      ],
    },
  ],

  marina: [
    {
      trigger: ['pão', 'biscoito', 'bolo', 'forno', 'receita'],
      lines: [
        'Fiz pão de queijo hoje cedo! Ainda tem uns três aqui, quer experimentar?',
        'A receita do pão eu aprendi com minha avó. Cada fornada é um presente.',
        'O bolo de fubá tá quase pronto. Uma hora saindo do forno — pode esperar?',
      ],
    },
    {
      trigger: ['comprar', 'sementes', 'farinha', 'mel', 'trigo'],
      lines: [
        'Farinha eu tenho em estoque. Trigo moído fresco essa semana!',
        'Mel da colmeia local — puro e gostoso. Te separo um pote?',
        'Tenho farinha de trigo, integral e de mandioca. Qual você precisa?',
      ],
    },
    {
      trigger: ['família', 'filhos', 'marido', 'história'],
      lines: [
        'Ah, minha família... Aprendi a fazer pão com minha vovó. É tradição de gerações.',
        'Tenho dois filhos. Cresceram comendo meu pão e hoje vivem na cidade grande.',
        'O vilarejo é minha família agora. Cada pessoa que entra aqui é como um de casa.',
      ],
    },
    {
      trigger: ['café', 'chá', 'beber', 'tomar'],
      lines: [
        'Café? Sempre tenho passado aqui! Entra, senta um pouquinho.',
        'Chá de erva-cidreira é o que tenho agora. Bom pra acalmar o coração.',
        'Toma um café comigo! Não precisa de motivo pra sentar e conversar.',
      ],
    },
    {
      trigger: ['padaria', 'negócio', 'movimento', 'loja'],
      lines: [
        'A padaria é minha vida. Abro de manhã cedo e fecho com o coração cheio.',
        'Movimento bom essa semana. As pessoas gostam de pão fresquinho, graças a Deus.',
        'Já pensei em ampliar a padaria. Mas o que tenho já é mais do que preciso pra ser feliz.',
      ],
    },
    {
      trigger: ['dica', 'conselho', 'receita', 'como fazer'],
      lines: [
        'Dica de ouro: pão bom começa com água morna, não quente. Fermento precisa de carinho.',
        'O segredo do biscoito é a manteiga gelada. Vai incorporando devagar na farinha.',
        'Nunca abre o forno antes de 20 minutos. A massa precisa crescer no calor estável.',
      ],
    },
    {
      trigger: ['tempo', 'clima', 'chuva', 'frio', 'sol'],
      lines: [
        'Dia frio é dia de pão quente. Fica aqui pertinho do forno comigo!',
        'Chuva lá fora e forno aceso aqui dentro — melhor combinação do mundo.',
        'Sol forte hoje. Bom pra lavoura, mas a massa cresce mais rápido com o calor.',
      ],
    },
  ],

  bento: [
    {
      trigger: ['ferramenta', 'enxada', 'regador', 'picareta', 'comprar'],
      lines: [
        'Tenho o que precisa. Que tipo de ferramenta?',
        'Estoque bom essa semana. Ferramenta certa faz diferença no campo.',
        'Preço justo, produto duradouro. É o que ofereço.',
      ],
    },
    {
      trigger: ['plantar', 'planta', 'sementes', 'solo', 'terra'],
      lines: [
        'Prepara o solo primeiro. Terra dura não deixa raiz crescer.',
        'Solo bom: adubo, revolvimento e drenagem. Nessa ordem.',
        'Planta na hora certa da estação. Pressa no campo custa caro.',
      ],
    },
    {
      trigger: ['colheita', 'colher', 'safra', 'produção'],
      lines: [
        'Espera o ponto certo. Colheita cedo é perda, colheita tarde também.',
        'Produto bom no tempo certo. Isso é o que faz fazendeiro prosperar.',
        'Colheu bem essa semana? Bom trabalho é o que se espera.',
      ],
    },
    {
      trigger: ['animal', 'gado', 'galinha', 'porco', 'lucia'],
      lines: [
        'Fala com a Lucia. Ela entende de animal melhor que eu.',
        'Animal dá trabalho, mas retorno certo. Só não é pra todo mundo.',
        'Já pensei em criar gado. Decidi focar no campo. Cada um no seu.',
      ],
    },
    {
      trigger: ['dica', 'conselho', 'como', 'melhor', 'ajuda'],
      lines: [
        'Revira o solo toda semana. Terra que não respira não produz.',
        'Adubo orgânico é melhor que químico. Demora mais, mas não estraga o solo.',
        'Trabalho constante é o único segredo. Não tem atalho no campo.',
      ],
    },
    {
      trigger: ['tempo', 'chuva', 'sol', 'seca', 'geada'],
      lines: [
        'Chuva demais apodrece raiz. Drenagem boa é tão importante quanto rega.',
        'Seca? Cubra o solo com palha. Retém umidade por mais tempo.',
        'Geada mata broto novo. Cobre as mudas à noite quando o frio vem.',
      ],
    },
    {
      trigger: ['loja', 'negócio', 'estoque', 'suprimentos'],
      lines: [
        'Depósito tá abastecido. Pode vir quando precisar.',
        'Trabalho com produto de qualidade. Não pego lixo pra vender.',
        'Muitos anos no ramo. Sei o que fazendeiro precisa.',
      ],
    },
  ],

  lucia: [
    {
      trigger: ['animal', 'animais', 'gado', 'galinha', 'vaca', 'porco'],
      lines: [
        'Os animais são minha vida! Hoje cedo alimentei o gado e as galinhas já botaram ovo.',
        'Cada animal tem personalidade própria. Você aprende a conhecer eles com o tempo.',
        'Gado feliz produz mais. Ambiente calmo, trato no horário certo, carinho sempre.',
      ],
    },
    {
      trigger: ['leite', 'lã', 'ovo', 'produção', 'ordenha'],
      lines: [
        'Leite fresco todo dia de manhã. Tô com excedente essa semana, quer comprar?',
        'Lã de ovelha é pura qualidade. Corto quando o animal tá confortável.',
        'As galinhas botaram bem essa semana! Ovo fresquinho aqui se você quiser.',
      ],
    },
    {
      trigger: ['comprar', 'vender', 'produto'],
      lines: [
        'Tenho leite, ovos e lã disponíveis. O que você precisa?',
        'Produto fresco do dia! Preço justo e qualidade garantida.',
        'Esses produtos vêm dos meus animais — são tratados com todo cuidado.',
      ],
    },
    {
      trigger: ['dica', 'conselho', 'cuidar', 'como', 'criar'],
      lines: [
        'Animal doente aparece antes que você perceba. Olho no comportamento todo dia.',
        'Trato limpo e na hora certa. Animal com fome ou sede fica estressado.',
        'Paciência é a primeira coisa. Animal não obedece na força, obedece na confiança.',
      ],
    },
    {
      trigger: ['fazenda', 'campo', 'planta', 'colheita'],
      lines: [
        'Amo os animais, mas respeito quem cultiva. Todo mundo tem seu lugar na fazenda.',
        'Os animais e as plantações se completam. Estrume vira adubo, adubo vira alimento.',
        'Uma fazenda completa tem campo e criação. Não precisa ter tudo, mas ajuda.',
      ],
    },
    {
      trigger: ['tempo', 'frio', 'chuva', 'calor', 'clima'],
      lines: [
        'Frio demais estressa o gado. Abrigo aquecido é essencial no inverno.',
        'Calor forte? Os animais precisam de sombra e água fresca todo tempo.',
        'Chuva é boa, mas lama muito funda machuca o casco do gado. Atenção!',
      ],
    },
    {
      trigger: ['ferraz', 'nina', 'bento', 'marina', 'dorinha'],
      lines: [
        'Todo mundo aqui se ajuda. É assim que o vilarejo funciona.',
        'Os vizinhos são boa gente. Cada um tem sua especialidade.',
        'Gosto muito daqui. A comunidade é o que faz valer a pena.',
      ],
    },
  ],

  ferraz: [
    {
      trigger: ['melhorar', 'aprimorar', 'upgrade', 'reforçar', 'fortalecer'],
      lines: [
        'Melhoria de ferramenta leva um dia. Traz aqui amanhã cedo.',
        'Pra reforçar preciso de minério de ferro. Tem algum?',
        'Ferramenta boa melhora ainda mais. Qual você quer aprimorar?',
      ],
    },
    {
      trigger: ['comprar', 'estoque', 'vender', 'tem', 'preço'],
      lines: [
        'Tenho enxada, picareta e facão disponíveis. Tudo forjado aqui.',
        'Preço justo pelo trabalho honesto. É o que ofereço.',
        'O estoque vai e vem. Diz o que precisa que vejo o que tenho.',
      ],
    },
    {
      trigger: ['minério', 'ferro', 'aço', 'cobre', 'metal'],
      lines: [
        'Minério de ferro bom é difícil de achar. Se você encontrar, me vende que pago bem.',
        'Cobre eu tenho em falta. Se achar no campo, traz aqui.',
        'Qualidade do minério define qualidade da ferramenta. Não adianta poupar aí.',
      ],
    },
    {
      trigger: ['forja', 'forjar', 'fundir', 'trabalho', 'ferraria'],
      lines: [
        'Forja tá quente o dia todo. É o coração dessa ferraria.',
        'Cada peça forjada aqui tem minha assinatura. Qualidade que dura.',
        'Forjar é arte. Não é qualquer um que aprende. Levei anos pra dominar.',
      ],
    },
    {
      trigger: ['dica', 'conselho', 'como', 'melhor', 'cuidar'],
      lines: [
        'Ferramenta de metal: seca antes de guardar. Umidade enferruja rápido.',
        'Afia a enxada toda semana. Ferramenta cega estraga o trabalho e o braço.',
        'Lija fina no cabo de madeira evita bolha. Detalhe que faz diferença todo dia.',
      ],
    },
    {
      trigger: ['arma', 'espada', 'faca', 'lança'],
      lines: [
        'Forjo armas sim, mas não é o foco aqui. Que tipo você precisa?',
        'Faca boa serve pro campo e pra cozinha. Tenho algumas prontas.',
        'Espada leva mais tempo e mais material. Me diz o uso que vai dar.',
      ],
    },
    {
      trigger: ['história', 'aprender', 'origem', 'família', 'vilarejo'],
      lines: [
        'Aprendi forja com o pai. Ele com o avô. Tradição de família.',
        'Vim pro vilarejo jovem. A ferraria tava abandonada — reformei e fiz minha.',
        'Não sou de muita conversa, mas trabalho honesto fala por mim.',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a pseudo-random line from an array using a simple index.
 *
 * @param {string[]} lines
 * @param {number} seed
 * @returns {string}
 */
function pickLine(lines, seed = 0) {
  if (!lines || lines.length === 0) return '';
  return lines[Math.abs(seed) % lines.length];
}

/**
 * Find a matching conversation flow line for an NPC given player text.
 * Returns null if no flow matches.
 *
 * @param {string} npcId
 * @param {string} playerText
 * @param {number} [seed]
 * @returns {string | null}
 */
export function getConversationFlow(npcId, playerText, seed = 0) {
  const flows = CONVERSATION_FLOWS[npcId];
  if (!flows) return null;
  const lower = playerText.toLowerCase();
  for (const flow of flows) {
    if (flow.trigger.some((word) => lower.includes(word))) {
      return pickLine(flow.lines, seed);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// NPC_CONVERSATIONS — metadata per NPC used by NPCDialogue
// ---------------------------------------------------------------------------

/** @type {Record<string, { npcId: string, openingLine: string, closingLine: string, flows: ConversationFlow[] }>} */
export const NPC_CONVERSATIONS = {
  nina: {
    npcId: 'nina',
    openingLine: 'Oi! Bem-vinda à ferragem. Em que posso ajudar hoje?',
    closingLine: 'Até mais! Qualquer coisa tô aqui na ferragem.',
    flows: CONVERSATION_FLOWS.nina,
  },
  dorinha: {
    npcId: 'dorinha',
    openingLine: 'Chegou na hora certa! O que você precisa hoje?',
    closingLine: 'Tchau! Volta quando quiser comprar ou vender.',
    flows: CONVERSATION_FLOWS.dorinha,
  },
  marina: {
    npcId: 'marina',
    openingLine: 'Que bom te ver! O pão tá saindo do forno agora. Entra!',
    closingLine: 'Tchau, meu bem! Volta sempre. A padaria tá sempre de portas abertas.',
    flows: CONVERSATION_FLOWS.marina,
  },
  bento: {
    npcId: 'bento',
    openingLine: 'Ei. Precisando de algo?',
    closingLine: 'Tá. Até mais. Bom trabalho.',
    flows: CONVERSATION_FLOWS.bento,
  },
  lucia: {
    npcId: 'lucia',
    openingLine: 'Olá! Que bom que veio. Os animais tão bem hoje!',
    closingLine: 'Até mais! Passa pra ver os animais quando quiser.',
    flows: CONVERSATION_FLOWS.lucia,
  },
  ferraz: {
    npcId: 'ferraz',
    openingLine: 'Precisa de algo forjado? Ou tá só passando?',
    closingLine: 'Até mais. A forja não para — nem eu.',
    flows: CONVERSATION_FLOWS.ferraz,
  },
};

export default NPC_CONVERSATIONS;
