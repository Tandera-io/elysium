export const FERRAZ_NPC_ID = 'ferraz' as const;

export interface FerrazQuickReply {
  label: string;
  input: string;
}

/** Snapshot of farm/world state for context-aware dialogue selection. */
export interface FerrazContext {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weather: 'sunny' | 'rainy' | 'drought';
  /** 0–10 heart scale tracked in gameState. */
  heartLevel: number;
  /** 0 = none, 1 = basic, 2 = copper, 3 = iron, 4 = gold. */
  toolLevel: number;
  cropsPlanted: number;
  oreInInventory: number;
  /** 0–23 game hour. */
  hour: number;
}

// ─── Greetings ────────────────────────────────────────────────────────────────

export const FERRAZ_GREETINGS: FerrazQuickReply[] = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
  { label: 'Trouxe minério', input: 'Trouxe um pouco de minério. Você compra?' },
];

// ─── Topics ───────────────────────────────────────────────────────────────────

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando na fazenda?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
    { label: 'Filosofia do trabalho', input: 'O que faz um bom artesão, na sua opinião?' },
    { label: 'Sobre Arnaldo', input: 'Como é sua parceria com o Arnaldo da marcenaria?' },
    { label: 'Origem do ofício', input: 'Quem te ensinou a trabalhar com metal?' },
  ],
  upgrades: [
    {
      label: 'Melhorar enxada',
      input: 'Quanto custa para melhorar minha enxada para o próximo nível?',
    },
    {
      label: 'Melhorar regador',
      input: 'Você consegue reforçar meu regador para regar mais plantas?',
    },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente para minerar.' },
    { label: 'Melhorar machado', input: 'Meu machado está ficando cansado. Você melhora?' },
    { label: 'Tempo de melhoria', input: 'Quanto tempo leva para melhorar uma ferramenta?' },
    { label: 'Materiais necessários', input: 'Quais materiais você precisa para fazer o upgrade?' },
  ],
  crafting: [
    { label: 'Forjar espada', input: 'Você forja armas também, ou só ferramentas de fazenda?' },
    {
      label: 'Materiais especiais',
      input: 'Que materiais raros você precisa para forjar algo especial?',
    },
    {
      label: 'Tempo de produção',
      input: 'Quanto tempo leva para forjar uma ferramenta nova do zero?',
    },
    { label: 'Encomenda personalizada', input: 'Você aceita encomendas personalizadas?' },
    { label: 'Melhor material', input: 'Qual é o melhor metal que você já trabalhou?' },
    { label: 'Peça mais difícil', input: 'Qual é a peça mais difícil que você já forjou?' },
  ],
  seasonal: [
    { label: 'Primavera na ferraria', input: 'Como é a primavera para você na ferraria?' },
    { label: 'Verão e o calor', input: 'O calor do verão deve ser difícil perto da forja, né?' },
    {
      label: 'Outono e colheita',
      input: 'O pessoal traz mais ferramentas para consertar no outono?',
    },
    { label: 'Inverno na ferraria', input: 'Como é trabalhar na ferraria durante o inverno frio?' },
  ],
  farm_tips: [
    {
      label: 'Dica para iniciante',
      input: 'Qual o primeiro conselho que você daria para um fazendeiro novo?',
    },
    {
      label: 'Cuidado com ferramentas',
      input: 'Como eu devo cuidar das minhas ferramentas para durarem mais?',
    },
    {
      label: 'Ferramenta mais importante',
      input: 'Se você só pudesse ter uma ferramenta na fazenda, qual seria?',
    },
    {
      label: 'Manutenção regular',
      input: 'Com que frequência devo trazer minhas ferramentas para manutenção?',
    },
    {
      label: 'Sinais de desgaste',
      input: 'Como eu sei quando uma ferramenta está precisando de reparo?',
    },
  ],
  relationship: [
    { label: 'Falar sobre a vida', input: 'Me conta um pouco mais sobre você, Ferraz.' },
    { label: 'Família do Ferraz', input: 'Você tem família por aqui?' },
    { label: 'Sonhos e planos', input: 'Qual é o seu maior sonho como ferreiro?' },
    {
      label: 'Trabalho favorito',
      input: 'Qual tipo de trabalho você mais gosta de fazer na ferraria?',
    },
    { label: 'Descanso', input: 'O que você faz quando não está trabalhando na forja?' },
    { label: 'Presente favorito', input: 'O que te agrada receber como presente?' },
  ],
  weather: [
    { label: 'Dia chuvoso', input: 'Essa chuva está atrapalhando seu trabalho hoje?' },
    { label: 'Dia ensolarado', input: 'Um dia lindo como esse te anima para trabalhar mais?' },
    { label: 'Previsão do tempo', input: 'Você acha que vai chover muito esta semana?' },
  ],
};

// ─── Shop trigger phrases ─────────────────────────────────────────────────────

export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
  'vamos ver o que tem disponível',
  'abre a loja pra mim',
];

// ─── Contextual dialogue lines (used by server mock + AI prompt context) ──────

/** Dialogue lines keyed by context. Used in server mock responses. */
export const FERRAZ_CONTEXTUAL_LINES: Record<string, string[]> = {
  greeting_morning: [
    'Bom dia! Cheguei cedo hoje para acabar umas peças antes do calor pegar.',
    'Manhã boa pra trabalhar! A forja já está quente.',
    'Acordei com o sol pra adiantar umas encomendas. O que precisa?',
  ],
  greeting_afternoon: [
    'Boa tarde. Tô no meio de uma peça, mas pode falar.',
    'Passando bem, mãos cheias de carvão como sempre. Precisa de algo?',
    'À tarde a ferraria ferve — no sentido literal! Entre.',
  ],
  greeting_evening: [
    'Quase fechando por hoje, mas ainda dá tempo. O que precisa?',
    'Boa noite. Tô terminando os retoques nas ferramentas do Bento.',
    'Já tô guardando as ferramentas. Tem alguma urgência?',
  ],
  first_meeting: [
    'Ah, você é o novo fazendeiro da propriedade antiga. Sou Ferraz, ferreiro da cidade. Se precisar melhorar suas ferramentas, aqui é o lugar certo.',
    'Bem-vindo. Eu sou Ferraz. Trabalho com metal há vinte anos. Se sua enxada ou regador precisar de reforço, já sabe onde me achar.',
  ],
  low_friendship: [
    'Pode falar. Não sou de papo longo, mas ajudo no que precisar.',
    'Sim? Está precisando de alguma melhoria?',
    'Ferramentas são como a extensão dos seus braços — cuide bem delas.',
  ],
  medium_friendship: [
    'Boa ver você por aqui. Como está indo a fazenda?',
    'Cada vez que você aparece com as ferramentas, percebo que está levando a sério. Gosto disso.',
    'Vi sua plantação passando pela estrada. Ficou bonita, viu.',
  ],
  high_friendship: [
    'Ah, meu amigo! Sempre bom ver você. Tem alguma peça especial que você quer que eu faça?',
    'Você me lembra quando eu era jovem, cheio de energia pra trabalhar a terra. Guardo isso com carinho.',
    'Tenho guardado um minério especial que achei. Achei que você poderia usar em algo bom.',
  ],
  spring: [
    'Primavera chegou e todo mundo quer afiar a enxada. Tô ocupado que só vendo.',
    'Na primavera, preparo ferramentas para plantio. É meu período mais movimentado.',
    'Com o solo amolecendo após o inverno, é hora de ter uma enxada afiada. Posso ajudar com isso.',
  ],
  summer: [
    'Esse calor do verão junto com a forja... é quente mas não tem jeito. O trabalho não para.',
    'No verão peço ao Lucas para buscar água do rio mais cedo. A forja consome bastante.',
    'Olha, trabalhar no verão com o fogo da forja não é fácil, mas é minha vida.',
  ],
  fall: [
    'No outono pessoal traz ferramentas desgastadas da colheita. Tenho bastante serviço.',
    'Outono é bom: colheita farta, dinheiro circulando, minha oficina movimentada.',
    'Aproveitando o outono para repor o estoque de ferramentas antes do inverno.',
  ],
  winter: [
    'No inverno a forja aquece bem a ferraria. Até tem vantagem.',
    'Inverno é tempo de fazer peças ornamentais e experimentar novos designs. Tempo criativo.',
    'Com menos gente na rua, consigo me concentrar em peças mais complexas no inverno.',
  ],
  tools_advice: [
    'Uma boa enxada precisa de cabo firme e lâmina afiada. Descuide de qualquer um e vai perder rendimento.',
    'O regador de cobre que eu faço aguenta dez anos sem enferrujar. Vale cada moeda.',
    'Nunca deixe ferramentas de ferro molhar sem secar depois. Ferrugem é o inimigo do fazendeiro.',
    'Um machado bem equilibrado cansa menos o braço. Postura e ferramenta andam juntos.',
  ],
  ore_info: [
    'Ferro você acha nas rochas do norte, perto do riacho. Cobre é mais raro, mas tem na caverna do morro.',
    'Minério de ouro é especial — eu raramente trabalho com ele, mas quando vem, faço algo extraordinário.',
    'Traz o minério bruto aqui que eu processo. Pago bem por pedra de qualidade.',
  ],
  upgrade_info: [
    'Para melhorar a enxada preciso de cinco lingotes de ferro e dois dias de trabalho.',
    'O regador de cobre aguenta muito mais — vale o custo. Dois lingotes de cobre bastam.',
    'Upgradar a picareta para ferro é a melhor decisão de um minerador. Quebra pedra três vezes mais rápido.',
  ],
  craftsmanship: [
    'Cada peça que sai daqui leva meu nome. Não entrego algo que não me orgulho.',
    'Meu avô dizia: a ferramenta reflete quem a fez. Por isso nunca apresso um trabalho.',
    'Qualidade leva tempo. Quem quer rápido vai à cidade grande. Quem quer bom, vem aqui.',
  ],
};

// ─── Farm status dialogue ─────────────────────────────────────────────────────

/** Quick replies tailored to the player's current tool progression stage. */
export const FERRAZ_FARM_STATUS_DIALOGUE: Record<string, FerrazQuickReply[]> = {
  noTools: [
    {
      label: 'Por onde começo?',
      input: 'Sou novo na fazenda e não tenho ferramentas. Por onde começo?',
    },
    {
      label: 'Kit inicial',
      input: 'Qual o kit mínimo de ferramentas que um fazendeiro precisa para começar?',
    },
    {
      label: 'Ferramenta mais barata',
      input: 'Qual ferramenta básica você vende mais barata para quem está começando?',
    },
  ],
  basicTools: [
    {
      label: 'Hora do upgrade?',
      input: 'Tenho ferramentas básicas. É hora de melhorá-las ou espero mais?',
    },
    {
      label: 'Qual upgrade primeiro?',
      input: 'Entre enxada, regador e picareta, qual vale mais a pena melhorar primeiro?',
    },
    {
      label: 'Custo do primeiro upgrade',
      input: 'Quanto custa o primeiro upgrade de ferramentas? Preciso planejar.',
    },
  ],
  upgradedTools: [
    {
      label: 'Próximo nível',
      input: 'Minhas ferramentas já são boas. Ainda tem como melhorar mais?',
    },
    {
      label: 'Peça especial',
      input: 'Ferraz, com ferramentas no topo, existe alguma peça especial que só você faz?',
    },
    {
      label: 'Artesanato lendário',
      input: 'Você consegue forjar algo de nível lendário? Preciso de algo extraordinário.',
    },
  ],
};

/** Quick replies triggered by player actions like bringing ore or harvesting. */
export const FERRAZ_ACTION_REPLIES: Record<string, FerrazQuickReply[]> = {
  gaveOre: [
    {
      label: 'Trouxe minério!',
      input: 'Ferraz, trouxe o minério que você precisava. Pode usar para forjar.',
    },
    {
      label: 'Quanto você paga?',
      input: 'Trouxe minério de ferro bruto. Quanto você paga por isso?',
    },
  ],
  requestedUpgrade: [
    {
      label: 'Quero o melhor',
      input: 'Ferraz, quero o upgrade mais alto possível. Quanto vai custar?',
    },
    {
      label: 'Prazo do upgrade',
      input: 'Quanto tempo vai levar o upgrade? Preciso das ferramentas logo para a colheita.',
    },
  ],
  justMet: [
    {
      label: 'Primeira vez aqui',
      input: 'É minha primeira vez na ferraria. O que você faz exatamente aqui?',
    },
    {
      label: 'Ouvi falar de você',
      input: 'Me falaram que você é o melhor ferreiro da região. É verdade?',
    },
  ],
  harvestDone: [
    {
      label: 'Safra boa!',
      input: 'Ferraz, tive uma safra excelente! Posso investir em melhores ferramentas agora.',
    },
    {
      label: 'Safra ruim',
      input: 'A safra não foi boa esse ano. Preciso de ferramentas mais duráveis pro próximo.',
    },
  ],
};

// ─── Context helpers ──────────────────────────────────────────────────────────

/** Returns context-appropriate greetings based on current farm/world state. */
export function getFerrazContextGreetings(ctx: Partial<FerrazContext>): FerrazQuickReply[] {
  if (ctx.heartLevel !== undefined && ctx.heartLevel <= 0) {
    return FERRAZ_ACTION_REPLIES.justMet ?? FERRAZ_GREETINGS;
  }
  if (ctx.season) {
    const seasonal = FERRAZ_CONTEXTUAL_LINES[ctx.season];
    if (seasonal) {
      return seasonal.map((line, i) => ({
        label: `[${ctx.season}] Opção ${i + 1}`,
        input: line,
      }));
    }
  }
  return FERRAZ_GREETINGS;
}

/** Returns quick replies appropriate for the player's tool progression. */
export function getFerrazStatusTopics(ctx: Partial<FerrazContext>): FerrazQuickReply[] {
  const fallback = FERRAZ_TOPICS.farm_tips ?? FERRAZ_GREETINGS;
  if (ctx.toolLevel !== undefined) {
    if (ctx.toolLevel === 0) return FERRAZ_FARM_STATUS_DIALOGUE.noTools ?? fallback;
    if (ctx.toolLevel < 3) return FERRAZ_FARM_STATUS_DIALOGUE.basicTools ?? fallback;
    return FERRAZ_FARM_STATUS_DIALOGUE.upgradedTools ?? fallback;
  }
  return fallback;
}

/** Returns time-of-day appropriate contextual lines. */
export function getFerrazTimeLines(hour: number): string[] {
  if (hour >= 6 && hour < 12) return FERRAZ_CONTEXTUAL_LINES.greeting_morning ?? [];
  if (hour >= 12 && hour < 18) return FERRAZ_CONTEXTUAL_LINES.greeting_afternoon ?? [];
  if (hour >= 18 && hour < 20) return FERRAZ_CONTEXTUAL_LINES.greeting_evening ?? [];
  return ['A ferraria está fechada. Volte amanhã cedo.'];
}

/** Returns friendship-level contextual lines. */
export function getFerrazFriendshipLines(heartLevel: number): string[] {
  if (heartLevel <= 0) return FERRAZ_CONTEXTUAL_LINES.first_meeting ?? [];
  if (heartLevel <= 3) return FERRAZ_CONTEXTUAL_LINES.low_friendship ?? [];
  if (heartLevel <= 6) return FERRAZ_CONTEXTUAL_LINES.medium_friendship ?? [];
  return FERRAZ_CONTEXTUAL_LINES.high_friendship ?? [];
}

// ─── Aggregate export ─────────────────────────────────────────────────────────

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
  contextualLines: FERRAZ_CONTEXTUAL_LINES,
  farmStatus: FERRAZ_FARM_STATUS_DIALOGUE,
  actionReplies: FERRAZ_ACTION_REPLIES,
} as const;

export default FERRAZ_DIALOGUE;
