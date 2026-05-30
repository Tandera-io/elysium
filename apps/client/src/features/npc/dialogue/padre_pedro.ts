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
    'Com fé e dedicação, faremos o que for preciso para a comunidade.',
    'É uma honra servir. Conte comigo para essa tarefa, meu filho.',
    'A humildade do serviço engrandece o espírito. Vou fazer com prazer.',
  ],
  working: [
    'Cada ato de serviço é uma oração em si. Trabalhando com calma.',
    'O bom trabalho não tem pressa, tem propósito. Já termino.',
    'Deus abençoa as mãos que trabalham com boas intenções.',
  ],
  completed: [
    'Graças a Deus, está concluído. Que sirva ao bem de todos.',
    'Pronto, meu filho. Feito com boa vontade e muito cuidado.',
    'Terminei. Que esse trabalho traga frutos para toda a comunidade.',
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
