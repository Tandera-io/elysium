export const NINA_NPC_ID = 'nina' as const;

export interface NinaQuickReply {
  label: string;
  input: string;
}

export const NINA_GREETINGS: NinaQuickReply[] = [
  { label: 'Oi, Nina!', input: 'Oi, Nina! Como você está?' },
  { label: 'Quero comprar ferramenta', input: 'Você tem ferramentas para vender?' },
  { label: 'Quero sementes especiais', input: 'Quais sementes você tem disponíveis?' },
  { label: 'Como vai o negócio?', input: 'Como está o movimento na ferragem?' },
];

export const NINA_TOPICS: Record<string, NinaQuickReply[]> = {
  general: [
    { label: 'Dica de plantio', input: 'Qual ferramenta é essencial para plantar bem?' },
    { label: 'Perguntar sobre Bento', input: 'O Tio Bento compra muito aqui?' },
    { label: 'Manutenção de ferramentas', input: 'Como faço para conservar minha enxada?' },
  ],
  tools: [
    { label: 'Comprar regador', input: 'Quanto custa o regador? Meu velho estragou.' },
    { label: 'Comprar enxada', input: 'Você tem enxada boa para terreno duro?' },
    { label: 'Comprar adubo', input: 'Que tipo de adubo você recomenda para hortaliças?' },
  ],
  seeds: [
    { label: 'Sementes de abóbora', input: 'Quer dizer que você vende sementes de abóbora?' },
    {
      label: 'Sementes de morango',
      input: 'Tenho interesse em morango. Quanto custam as sementes?',
    },
    { label: 'Melhor época de plantar', input: 'Qual é a melhor época para plantar morango aqui?' },
  ],
};

export const NINA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferragem',
  'posso te mostrar o estoque',
  'dá uma olhada nas ferramentas',
  'pode escolher o que precisa',
  'olha o que tenho aqui',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const NINA_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Pode contar! Tenho tudo o que precisa aqui na ferragem.',
    'Ótimo! Adoro quando posso ajudar com alguma coisa prática.',
    'Claro, sem problema! Já sei o que fazer. Deixa comigo!',
  ],
  working: [
    'Trabalhando nisso já! Ferramentas certas fazem toda a diferença.',
    'Quase lá! Tô fazendo com muito cuidado pra não errar.',
    'Não demora mais, tô quase terminando essa parte aqui.',
  ],
  completed: [
    'Pronto! Fiz direitinho, pode conferir cada detalhe.',
    'Terminei! Espero que tenha ficado do jeito que você queria.',
    'Missão concluída! Qualquer coisa, é só chamar de novo.',
  ],
};

export const NINA_DIALOGUE = {
  npcId: NINA_NPC_ID,
  greetings: NINA_GREETINGS,
  topics: NINA_TOPICS,
  shopTriggerPhrases: NINA_SHOP_TRIGGER_PHRASES,
  choreDialogue: NINA_CHORE_DIALOGUE,
} as const;

export default NINA_DIALOGUE;
