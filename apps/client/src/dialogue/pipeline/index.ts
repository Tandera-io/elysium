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
} as const);

type ContextStage = 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend';

interface Context {
  interactionCount?: number;
  heartLevel?: number;
}

const FIRST_MEETING_LINES: Record<string, string[]> = {
  ferraz: [
    'Ei, rosto novo! Bem-vindo à ferraria. Sou o Ferraz — se precisar de ferramenta boa ou upgrade, é aqui.',
    'Nunca te vi por aqui antes. O nome é Ferraz. Trabalho com metal desde os doze anos. O que precisa?',
    'Pode chegar, sem cerimônia. Ferraz, ferreiro. Se o seu equipamento estiver frouxo, eu resolvo.',
    'Hm, visita nova. Sou o Ferraz. Faço ferramenta que dura. Se quiser coisa de qualidade, é aqui.',
  ],
  nina: [
    'Olá! Eu sou Nina. Se precisar de ferramenta ou semente, pode contar comigo!',
    'Bem-vindo à ferragem! Sou Nina. Temos tudo que você precisa para a roça.',
    'Chegou em boa hora! Acabei de receber estoque novo. Eu sou Nina, é um prazer!',
    'Oi! Nunca te vi por aqui. Sou a Nina. Ferramenta boa e semente de qualidade — tudo aqui!',
  ],
  dorinha: [
    'Oi, oi! Sou a Dorinha, da quitanda. Se quiser comprar ou vender safra, é aqui!',
    'Olá! Nunca te vi por aqui. Sou a Dorinha. Pode chegar, temos sementes e compramos colheita!',
    'Bem-vindo! Sou Dorinha. Precisa de semente ou quer vender o que colheu? Pode falar!',
    'Eita, rosto novo! Dorinha, prazer! A quitanda é aqui — semente, safra, tudo a gente resolve.',
  ],
  marina: [
    'Que bom ver um rosto novo! Sou a Marina, da padaria. Se quiser pão fresquinho, é aqui!',
    'Olá, bem-vindo! Me chamo Marina. O cheirinho de pão quentinho veio até você, né?',
    'Oi! Nunca te vi por aqui, não. Marina, sou eu! Faço o melhor pão da região — sem modéstia.',
  ],
  bento: [
    'Hmm. Novo por aqui. Bento. Trabalho nessa terra faz tempo. Qualquer coisa, pode perguntar.',
    'Rosto novo. Sou o Bento. Se precisar de conselho sobre a roça, tô por aqui.',
    'Novo, hein? Tio Bento. Essa terra é boa pra quem trabalha com juízo. Bem-vindo.',
  ],
  lucia: [
    'Oi! Sou a Lucia. Cuido dos animais por aqui. Se quiser saber sobre leite ou lã, pode me chamar!',
    'Bem-vindo! Lucia, criadora. Se precisar de produto animal, é comigo.',
    'Ai que bom, visita nova! Sou a Tia Lucia, meu bem. Cuido das vacas e das galinhas — venha me visitar!',
  ],
  padre_pedro: [
    'Que bom ver você por aqui, meu filho. Sou o Padre Pedro. Se precisar de algum conselho, pode me procurar.',
    'Bem-vindo à nossa comunidade! Sou o Padre Pedro. Esta terra é abençoada com boas pessoas.',
    'Olá, rosto novo! Padre Pedro, à sua disposição. Esta comunidade é acolhedora, pode ter certeza.',
    'Paz! Sou o Padre Pedro. Você chegou num bom momento — aqui cada pessoa que chega é uma bênção.',
  ],
  arnaldo: [
    'Oi. Sou o Arnaldo, carpinteiro. Se precisar de madeira trabalhada ou estrutura, é comigo.',
    'Nunca te vi por aqui. Arnaldo, marceneiro. Qualidade é o que ofereço.',
    'Chega com calma. Arnaldo — trabalho com madeira. Se precisar de algo sólido e bem-feito, fala.',
    'Bom dia. Arnaldo. Não sou de muita conversa, mas de madeira boa eu entendo. O que você precisa?',
  ],
  sofia: [
    'Olá! Eu sou Sofia. Cuido da saúde da comunidade com ervas e remédios naturais.',
    'Bem-vindo! Sou Sofia, a curandeira. Se precisar de algum remédio ou conselho de saúde, pode me procurar.',
    'Que bom te ver! Sofia, da botica. A natureza tem remédio pra quase tudo — pode me perguntar.',
    'Oi! Sofia aqui. Nunca te vi por aqui. Se estiver se sentindo mal ou só quiser conversar, pode chegar!',
  ],
  romeu: [
    'Eita, rosto novo! Sou o Romeu, pescador. O maior peixe que já peguei tinha mais de um metro — mas isso é história pra depois!',
    'Ô! Nunca te vi por aqui. Romeu, pescador do rio. Se quiser peixe fresco ou uma boa história, tô aqui!',
    'Chegou em boa hora! Acabei de voltar do rio com bastante peixe. Sou o Romeu — pode chamar!',
    'Olha aí! Visita nova. Romeu, pescador. O rio tá bem hoje — quase tão bem quanto as minhas histórias!',
  ],
};

const REPEAT_VISIT_LINES: Record<string, Record<string, string[]>> = {
  marina: {
    repeat_early: [
      'Voltou! Tem pão quentinho esperando por você.',
      'De volta! Sabia que ia querer mais, né?',
    ],
    repeat_regular: [
      'Que bom te ver! Fiz bolo de fubá hoje — quer provar?',
      'Sempre bom ter você por aqui! O que vai ser hoje?',
    ],
    friend: [
      'Meu cliente favorito! Já deixei um pãozinho separado pra você.',
      'Você é quase da família aqui na padaria!',
    ],
  },
  bento: {
    repeat_early: ['De volta. Precisa de mais trigo?', 'Voltou. Bom.'],
    repeat_regular: ['Sempre bom ver. O que precisa?', 'Apareceu. Tô aqui.'],
    friend: [
      'Você já é velho conhecido. Fala o que precisa.',
      'Te conheço bem já. O que vai querer hoje?',
    ],
  },
  lucia: {
    repeat_early: [
      'Meu bem, voltou! As galinhas até reconhecem você já!',
      'Que bom! Saudade de você! Como tá?',
    ],
    repeat_regular: [
      'Que alegria de novo! Sempre bom te ver, meu filho!',
      'Voltou! Tenho leite fresquinho do dia pra você!',
    ],
    friend: [
      'Você é meu filho adotivo já! Que bom te ver!',
      'Minha visita favorita! Pode entrar, meu bem!',
    ],
  },
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
  padre_pedro: {
    repeat_early: [
      'Que bom te ver de novo, meu filho. Como está o coração?',
      'Voltou! A comunidade fica mais rica com sua presença.',
    ],
    repeat_regular: [
      'Sempre uma alegria te ver por aqui. O que você precisa hoje?',
      'Bem-vindo de volta! A paz esteja com você.',
    ],
    friend: [
      'Meu amigo querido! Você já faz parte desta comunidade.',
      'Você é uma bênção para todos nós por aqui.',
    ],
  },
  arnaldo: {
    repeat_early: [
      'De volta. Precisando de madeira?',
      'Voltou. Boa escolha — qualidade não tem substituto.',
    ],
    repeat_regular: [
      'Sempre bom te ver. O que vai precisar hoje?',
      'De volta! Tenho peças novas prontas.',
    ],
    friend: [
      'Meu cliente fiel. Vou separar a melhor madeira pra você.',
      'Você é praticamente da família aqui na marcenaria.',
    ],
  },
  sofia: {
    repeat_early: [
      'Voltou! Precisando de mais remédio ou só de uma conversa?',
      'Que bom te ver de novo! As ervas estão frescas hoje.',
    ],
    repeat_regular: [
      'Sempre uma alegria! O que você precisa hoje?',
      'De volta! Acabei de preparar um lote novo de remédios.',
    ],
    friend: [
      'Minha amiga de sempre! Já separei as melhores ervas pra você.',
      'Você é quase uma aprendiz aqui na botica!',
    ],
  },
  romeu: {
    repeat_early: [
      'Ei, voltou! Quer mais peixe ou outra história?',
      'Que bom te ver! O rio tá cheio de peixe hoje.',
    ],
    repeat_regular: [
      'Meu cliente fiel! Tô com novidade no estoque.',
      'Voltou! Tenho uma história nova pra te contar.',
    ],
    friend: [
      'Meu parceiro de pesca favorito! Mesmo que você não pesque comigo...',
      'Você é meu melhor cliente — e o que melhor aguenta minhas histórias!',
    ],
  },
};

const ACTION_RESPONSES: Record<string, Record<string, string[]>> = {
  marina: {
    greet: [
      'Oi! Que bom ver você! Quer um pãozinho fresquinho?',
      'Que alegria! Como posso te ajudar hoje?',
      'Bem-vindo à padaria! Acabou de sair do forno.',
    ],
    buy: ['Boa escolha! O pão de hoje ficou especial.', 'Pode pegar! Fiz bastante hoje cedo.'],
    sell: [
      'Compro trigo e leite! Quanto você tem?',
      'Sempre preciso de bons ingredientes. O que trouxe?',
    ],
    give_gift: [
      'Que fofo você! Obrigada de coração.',
      'Não precisava, mas adorei! Muito obrigada.',
    ],
    talk: [
      'Cresci aqui com a Dorinha. A gente aprontava muito quando era pequena!',
      'O segredo do meu pão é o trigo do Tio Bento — grão de primeira.',
      'Às vezes sinto saudade de quando a praça ficava cheia nas festas. A gente dançava a noite toda.',
      'Leite fresco da Tia Lucia faz toda a diferença no bolo de fubá. Ingrediente faz tudo.',
    ],
    quest_accept: ['Pode contar! Faço com prazer.'],
    quest_complete: ['Que maravilha! Muito obrigada!', 'Perfeito! Você é ótimo demais.'],
    goodbye: ['Até mais! Volta pra comer pão fresquinho!', 'Tchau! Cuida-se!'],
  },
  bento: {
    greet: ['Boa. O que você precisa?', 'Fala. Tô ouvindo.', 'Chegou. O que é que é?'],
    buy: ['Tenho trigo bom. Pode levar.', 'Vendo. Mas cobra caro não — preço justo.'],
    sell: ['Compro lenha e material de qualidade. O que trouxe?'],
    give_gift: ['Não era necessário. Mas obrigado.', 'Grato. Uso bem.'],
    talk: [
      'Terra boa precisa de paciência. Não adianta apressar.',
      'Meu pai dizia: chão que você não cuida, não te cuida de volta.',
      'O rio da Romeu lembra quando chove muito. Segredo da terra é respeitar o tempo dela.',
      'Plantio sem cuidado é desperdício. Simples assim.',
    ],
    quest_accept: ['Tá bem. Faço o que posso.'],
    quest_complete: ['Pronto. Feito.', 'Acabei. Testa aí.'],
    goodbye: ['Até mais.', 'Vai com Deus.'],
  },
  lucia: {
    greet: [
      'Ai, meu bem! Que bom te ver! Como você tá?',
      'Meu filho! Chegou! Quer leite fresquinho?',
      'Que alegria! A casa fica mais animada com visita!',
    ],
    buy: [
      'Pode levar, meu bem! Leite e ovo fresquinhos do dia.',
      'Claro que sim! Tenho bastante hoje — as galinhas capricharam!',
    ],
    sell: ['Compro milho pra dar pras galinhas! Quanto você tem?'],
    give_gift: [
      'Ai, coração bom demais! Obrigada, meu bem!',
      'Não precisava, meu filho! Mas fico tão feliz!',
    ],
    talk: [
      'As vacas têm mais juízo do que parece. Elas sentem quando a pessoa é boa.',
      'O Bento acorda antes de mim todo dia. Homem de trabalho mesmo, meu bem.',
      'Cuido das minhas vacas como se fossem filha. Elas me dão leite, eu cuido delas — troca justa!',
      'A Marina cresceu aqui pertinho. Criança danada, mas boa de coração. Ficou boa mulher!',
    ],
    quest_accept: ['Pode contar comigo, meu filho! Faço com todo amor!'],
    quest_complete: ['Graças a Deus! Que alívio! Obrigada!'],
    goodbye: ['Vai com Deus, meu bem! Volta sempre!', 'Tchau, meu filho! Cuida-se!'],
  },
  ferraz: {
    greet: [
      'Oi! Precisando de ferramenta ou upgrade?',
      'Olá! O que posso fazer pela sua roça hoje?',
      'Pode falar — tô aqui pra isso.',
    ],
    buy: [
      'Claro! Deixa eu te mostrar o que tenho disponível na ferraria.',
      'Boa escolha! Só trabalho com material de qualidade. Olha o que tenho aqui.',
    ],
    sell: [
      'Minério bom eu sempre aceito. Que tipo você trouxe?',
      'Depende do material. Ferro e aço eu pago bem. O que tem?',
    ],
    give_gift: [
      'Minério raro? Cara, você sabe o caminho pro meu coração.',
      'Isso aqui é minério de boa qualidade! Obrigado de verdade.',
    ],
    talk: [
      'Sabe o que me apaixona nesse trabalho? Metal que você forja com as próprias mãos vira algo útil de verdade.',
      'Eu aprendi a ferraria com meu pai. Ele dizia: ferramenta ruim é pior que nenhuma.',
      'Minério bom é difícil de achar por aqui, mas quando encontro, vira obra de arte.',
    ],
    quest_accept: ['Pode deixar. Se precisa de ferramenta forjada, eu faço.'],
    quest_complete: ['Pronto! Ficou melhor do que esperava. Testa aí.'],
    goodbye: [
      'Até mais! Volta quando precisar de upgrade.',
      'Cuida dessa ferramenta, hein! Tchau.',
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
    ],
    quest_accept: ['Pode deixar comigo!'],
    quest_complete: ['Ótimo trabalho! Obrigada.'],
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
    ],
    quest_accept: ['Pode contar comigo!'],
    quest_complete: ['Valeu demais! Muito obrigada.'],
    goodbye: ['Até mais! Volta com safra boa!', 'Tchau! Boas colheitas!'],
  },
  padre_pedro: {
    greet: [
      'A paz esteja com você! Como posso ajudar hoje?',
      'Que bom te ver! Está precisando de algo?',
      'Olá! A comunidade é sempre mais bonita com você por aqui.',
    ],
    buy: ['Meu filho, não tenho muito para vender, mas o que tenho é do coração.'],
    sell: ['Não me ocupo com comércio, mas talvez a Dorinha ou a Nina possam te ajudar.'],
    give_gift: [
      'Que gentileza! Que Deus te abençoe em dobro.',
      'Não era necessário, mas aceito com gratidão.',
    ],
    talk: [
      'Esta comunidade é como um jardim — precisa de cuidado e amor para florescer.',
      'Já passei por muitas dificuldades, mas a fé sempre me sustentou.',
      'O trabalho na roça é uma oração em movimento. Respeito quem cuida da terra.',
      'O Bento me confessou que sonha com chuva toda noite. Homem que ama a terra de verdade.',
    ],
    quest_accept: ['Pode contar comigo! É com prazer que ajudo.'],
    quest_complete: ['Graças a Deus! Muito obrigado.', 'Que bênção! Você é uma boa pessoa.'],
    goodbye: ['Que Deus te ilumine! Até logo.', 'Vai com Deus! Volte sempre.'],
  },
  arnaldo: {
    greet: ['Oi. Precisando de madeira ou estrutura?', 'Fala. O que você precisa?'],
    buy: ['Boa escolha. Só vendo coisa de qualidade.', 'Pode escolher. Tudo feito com capricho.'],
    sell: ['Compro madeira boa e ferro. O que você trouxe?'],
    give_gift: ['Madeira boa? Isso sim é presente.', 'Obrigado. Vou usar bem.'],
    talk: [
      'Uma estrutura bem-feita dura gerações. É isso que eu faço.',
      'Trabalho com o Ferraz às vezes. Ele cuida do ferro, eu da madeira. Bom parceiro.',
      'A madeira tem memória. Cada peça tem sua história antes de virar mobília.',
      'Meu pai era carpinteiro também. Aprendi que paciência é a ferramenta mais importante.',
    ],
    quest_accept: ['Pode deixar. Faço com qualidade.'],
    quest_complete: ['Pronto. Ficou bom, você vai ver.'],
    goodbye: ['Até mais. Cuida do que comprou.', 'Tchau. Volta quando precisar.'],
  },
  sofia: {
    greet: [
      'Olá! Precisa de algum remédio ou conselho de saúde?',
      'Que bom te ver! Como você está se sentindo?',
      'Chegou em boa hora — as ervas estão frescas!',
    ],
    buy: [
      'Boa escolha! Todos os remédios são naturais e testados.',
      'Pode escolher — tenho de tudo um pouco na botica.',
    ],
    sell: ['Compro ervas medicinais! O que você trouxe?'],
    give_gift: [
      'Mel e ervas! Você sabe o caminho para o meu coração.',
      'Que presente perfeito! Obrigada de verdade.',
    ],
    talk: [
      'A natureza tem remédio para quase tudo. É só saber onde olhar.',
      'Aprendi com minha avó que as ervas do campo valem ouro se você souber usá-las.',
      'A Lucia me ensinou muito sobre animais e plantas medicinais. Boa amiga.',
      'Colher ervas de manhã cedo, com o orvalho ainda na folha — é quando elas têm mais força.',
    ],
    quest_accept: ['Pode contar! Sei exatamente onde encontrar isso.'],
    quest_complete: ['Perfeito! Muito obrigada.', 'Que alívio! Você foi ótimo.'],
    goodbye: ['Cuida-se! Até logo.', 'Tchau! Qualquer coisa, volte aqui.'],
  },
  romeu: {
    greet: [
      'Oi! Quer peixe fresco ou uma história boa?',
      'Eita! Chegou na hora — acabei de limpar o peixe.',
      'Olá! O rio tá generoso hoje. O que vai querer?',
    ],
    buy: [
      'Pode escolher! Tudo fresquinho do rio desta manhã.',
      'Boa escolha! Peixe defumado é especialidade da casa.',
    ],
    sell: ['Não compro muito, mas peixe seco eu aceito sim.'],
    give_gift: ['Que isso! Obrigado de verdade.', 'Caramba, nem era necessário. Mas adorei!'],
    talk: [
      'Certa vez peguei um peixe tão grande que o barco afundou um palmo. Não é mentira!',
      'O Bento é meu parceiro de pesca. Homem quieto, mas sabe onde os peixes estão.',
      'O rio tem seus segredos. Só os que respeitam a correnteza descobrem os melhores lugares.',
      'Pesco desde os seis anos. Meu avô dizia que o peixe escolhe quem vai pegá-lo.',
    ],
    quest_accept: ['Pode deixar comigo! Conheço o rio como a palma da mão.'],
    quest_complete: [
      'Consegui! Não foi fácil, mas valeu.',
      'Missão cumprida. O rio cooperou hoje!',
    ],
    goodbye: [
      'Até mais! Volta amanhã — o peixe sempre está mais fresco de manhã.',
      'Tchau! E não esqueça: o maior peixe ainda está no rio!',
    ],
  },
};

const FALLBACK_RESPONSES: Record<string, string[]> = {
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

function pick(arr: string[], seed = 0): string {
  if (!arr || arr.length === 0) return '';
  return arr[seed % arr.length] ?? '';
}

function pickRandom(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)] ?? '';
}

export function classifyContext(context: Context = {}): ContextStage {
  const count = context.interactionCount ?? 0;
  const heart = context.heartLevel ?? 0;
  if (count <= 0) return 'first_meeting';
  if (heart >= 6 || count >= 20) return 'friend';
  if (count >= 5) return 'repeat_regular';
  return 'repeat_early';
}

export function getFirstMeetingLine(npcId: string, seed = 0): string {
  const lines = FIRST_MEETING_LINES[npcId];
  if (lines && lines.length > 0) return pick(lines, seed);
  return FALLBACK_RESPONSES['greet']?.[0] ?? '';
}

export function getRepeatVisitLine(npcId: string, context: Context = {}): string {
  const stage = classifyContext(context);
  if (stage === 'first_meeting') return getFirstMeetingLine(npcId);

  const npcRepeat = REPEAT_VISIT_LINES[npcId];
  if (npcRepeat) {
    const bucket = npcRepeat[stage] ?? npcRepeat['repeat_early'];
    if (bucket && bucket.length > 0) return pickRandom(bucket);
  }

  return FALLBACK_RESPONSES['greet']?.[0] ?? '';
}

export function getActionResponse(
  npcId: string,
  playerAction: string,
  context: Context = {},
): string {
  const stage = classifyContext(context);

  if (stage === 'first_meeting' && playerAction === PLAYER_ACTIONS.GREET) {
    return getFirstMeetingLine(npcId, context.interactionCount ?? 0);
  }

  const npcResponses = ACTION_RESPONSES[npcId];
  if (npcResponses) {
    const bucket = npcResponses[playerAction];
    if (bucket && bucket.length > 0) return pickRandom(bucket);
  }

  const fallback = FALLBACK_RESPONSES[playerAction] ?? FALLBACK_RESPONSES['default'];
  return pickRandom(fallback ?? []) || '...';
}

export function triggerDialogue(
  npcId: string,
  playerAction: string,
  context: Context = {},
): string[] {
  return [getActionResponse(npcId, playerAction, context)];
}
