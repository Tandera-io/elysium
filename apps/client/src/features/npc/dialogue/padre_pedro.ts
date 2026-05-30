export const PADRE_PEDRO_NPC_ID = 'padre_pedro' as const;

export interface PadrePedroQuickReply {
  label: string;
  input: string;
}

export const PADRE_PEDRO_GREETINGS: PadrePedroQuickReply[] = [
  { label: 'Bom dia, Padre!', input: 'Bom dia, Padre Pedro! Como o senhor está?' },
  { label: 'Preciso de conselho', input: 'Padre Pedro, posso pedir um conselho?' },
  { label: 'Como está a comunidade?', input: 'Como está a nossa comunidade?' },
  { label: 'Posso ajudar em algo?', input: 'Tem algo em que eu possa ajudar, Padre?' },
];

export const PADRE_PEDRO_TOPICS: Record<string, PadrePedroQuickReply[]> = {
  general: [
    { label: 'Sobre a comunidade', input: 'Quem mais precisa de ajuda aqui?' },
    { label: 'Sobre a fazenda', input: 'O que o senhor acha da vida no campo, Padre?' },
    { label: 'Sobre as festas', input: 'Quando é a próxima festa da comunidade?' },
  ],
  guidance: [
    { label: 'Conselho de vida', input: 'Padre, qual é o melhor conselho que o senhor já deu?' },
    { label: 'Sobre o trabalho', input: 'Como o senhor vê o trabalho na roça?' },
    { label: 'Momento difícil', input: 'Estou passando por um momento difícil...' },
  ],
};

export const PADRE_PEDRO_SHOP_TRIGGER_PHRASES: string[] = [];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const PADRE_PEDRO_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Com prazer. O trabalho honesto é uma forma de oração, meu filho.',
    'Pode contar comigo. A comunidade precisa de todos unidos.',
    'Farei com dedicação. Nenhum serviço é pequeno aos olhos do Senhor.',
  ],
  working: [
    'Cada passo com fé e perseverança. Assim se completa qualquer tarefa.',
    'Trabalhando devagar, mas com o coração no lugar certo.',
    'Deus abençoa quem trabalha com humildade e propósito.',
  ],
  completed: [
    'Está feito, com graça e gratidão. Que sirva bem à nossa comunidade.',
    'Terminei. Que esse serviço traga fruto e paz para todos.',
    'Pronto. Rezei por cada passo e o resultado está aqui para você.',
  ],
};

export const PADRE_PEDRO_DIALOGUE = {
  npcId: PADRE_PEDRO_NPC_ID,
  greetings: PADRE_PEDRO_GREETINGS,
  topics: PADRE_PEDRO_TOPICS,
  shopTriggerPhrases: PADRE_PEDRO_SHOP_TRIGGER_PHRASES,
  choreDialogue: PADRE_PEDRO_CHORE_DIALOGUE,
} as const;

export default PADRE_PEDRO_DIALOGUE;
