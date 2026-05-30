export const ARNALDO_NPC_ID = 'arnaldo' as const;

export interface ArnaldoQuickReply {
  label: string;
  input: string;
}

export const ARNALDO_GREETINGS: ArnaldoQuickReply[] = [
  { label: 'Oi, Arnaldo!', input: 'Oi, Arnaldo! Tudo certo?' },
  { label: 'Preciso de madeira', input: 'Você vende madeira trabalhada?' },
  { label: 'Quero uma cerca', input: 'Você consegue fazer uma cerca para minha fazenda?' },
  { label: 'Como vai o trabalho?', input: 'Como está a marcenaria, Arnaldo?' },
];

export const ARNALDO_TOPICS: Record<string, ArnaldoQuickReply[]> = {
  general: [
    { label: 'Sobre a marcenaria', input: 'Há quanto tempo você trabalha com madeira?' },
    { label: 'Parceria com Ferraz', input: 'Você e o Ferraz trabalham juntos?' },
    { label: 'Madeira local', input: 'Qual é a melhor madeira que você encontra aqui?' },
  ],
  woodwork: [
    { label: 'Comprar prancha', input: 'Quanto custa uma prancha de madeira boa?' },
    { label: 'Comprar cerca', input: 'Quanto você cobra por uma cerca?' },
    { label: 'Encomenda especial', input: 'Você faz peças sob encomenda?' },
  ],
};

export const ARNALDO_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a marcenaria',
  'posso te mostrar o estoque',
  'dá uma olhada na madeira',
  'pode escolher o que precisa',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const ARNALDO_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Pode me deixar com esse serviço. Conheço madeira melhor que ninguém aqui.',
    'Beleza, já sei o que fazer. Esse trabalho tá em boas mãos.',
    'Tá bom. Vou colocar minha experiência toda nessa tarefa.',
  ],
  working: [
    'Cortando, lixando, encaixando... cada peça no lugar certo.',
    'Trabalho de marceneiro pede calma e olho bom. Não me apresse.',
    'Madeira tem personalidade. Tenho que respeitar o jeito dela.',
  ],
  completed: [
    'Acabou! Olha o capricho no trabalho, ficou redondo!',
    'Pronto. Pode conferir cada detalhe, não vou te envergonhar.',
    'Terminei! Lixado, encaixado e firme. Pode usar sem medo.',
  ],
};

export const ARNALDO_DIALOGUE = {
  npcId: ARNALDO_NPC_ID,
  greetings: ARNALDO_GREETINGS,
  topics: ARNALDO_TOPICS,
  shopTriggerPhrases: ARNALDO_SHOP_TRIGGER_PHRASES,
  choreDialogue: ARNALDO_CHORE_DIALOGUE,
} as const;

export default ARNALDO_DIALOGUE;
