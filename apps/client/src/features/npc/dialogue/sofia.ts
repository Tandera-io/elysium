export const SOFIA_NPC_ID = 'sofia' as const;

export interface SofiaQuickReply {
  label: string;
  input: string;
}

export const SOFIA_GREETINGS: SofiaQuickReply[] = [
  { label: 'Oi, Sofia!', input: 'Oi, Sofia! Como você está?' },
  { label: 'Preciso de remédio', input: 'Você tem algum remédio natural?' },
  { label: 'Quero aprender', input: 'Você pode me ensinar sobre as ervas daqui?' },
  { label: 'Como está a botica?', input: 'Como está o movimento na botica?' },
];

export const SOFIA_TOPICS: Record<string, SofiaQuickReply[]> = {
  general: [
    { label: 'Sobre as ervas', input: 'Qual é a erva mais importante que você conhece?' },
    { label: 'Sobre a Lucia', input: 'Você e a Lucia são amigas há muito tempo?' },
    { label: 'Onde colher ervas', input: 'Onde você colhe as ervas melhores?' },
  ],
  remedies: [
    { label: 'Remédio para cansaço', input: 'Tem algo para dar energia depois de um dia pesado?' },
    {
      label: 'Remédio para safra',
      input: 'Existe algo que ajude as plantas a crescer mais fortes?',
    },
    { label: 'Poção especial', input: 'Você tem alguma poção especial?' },
  ],
};

export const SOFIA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a botica',
  'posso te mostrar os remédios',
  'dá uma olhada nas ervas',
  'pode escolher o que precisa',
  'olha o que tenho aqui',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const SOFIA_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Vou cuidar com todo carinho e atenção que isso merece.',
    'Claro! Cada tarefa é uma oportunidade de cuidar bem de alguém.',
    'Pode deixar. Ervas e trabalho pedem a mesma dedicação.',
  ],
  working: [
    'Cada passo tem que ser feito com cuidado e intenção.',
    'Trabalhando devagar e sempre, como a natureza ensina.',
    'Concentrada aqui. A pressa estraga até o melhor remédio.',
  ],
  completed: [
    'Pronto! Tudo feito com muito cuidado, pode conferir.',
    'Terminei. Espero que o resultado te traga alívio e alegria.',
    'Acabou! Fiz da mesma forma que preparo meus remédios: com amor.',
  ],
};

export const SOFIA_DIALOGUE = {
  npcId: SOFIA_NPC_ID,
  greetings: SOFIA_GREETINGS,
  topics: SOFIA_TOPICS,
  shopTriggerPhrases: SOFIA_SHOP_TRIGGER_PHRASES,
  choreDialogue: SOFIA_CHORE_DIALOGUE,
} as const;

export default SOFIA_DIALOGUE;
