export const FERRAZ_NPC_ID = 'ferraz' as const;

export interface FerrazQuickReply {
  label: string;
  input: string;
}

export const FERRAZ_GREETINGS: FerrazQuickReply[] = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
];

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
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

export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const FERRAZ_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Pode confiar. Vou fazer direito, sem pressa e sem desleixo.',
    'Trabalho bem feito não se negocia. Pode me deixar.',
    'Tá bom. Sei o que tenho que fazer. Já vou nessa.',
  ],
  working: [
    'Batendo ferro enquanto ele tá quente. Não me interrompe não.',
    'Cada golpe no lugar certo. Isso aqui precisa de concentração.',
    'Ferraria é assim: silêncio, fogo e trabalho sério.',
  ],
  completed: [
    'Tá pronto. Trabalho bem feito, pode conferir.',
    'Acabou. Testei tudo, não vai te decepcionar.',
    'Pronto. Não gosto de serviço pela metade, pode ficar tranquilo.',
  ],
};

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
  choreDialogue: FERRAZ_CHORE_DIALOGUE,
} as const;

export default FERRAZ_DIALOGUE;
