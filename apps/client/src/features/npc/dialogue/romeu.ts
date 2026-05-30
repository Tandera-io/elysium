export const ROMEU_NPC_ID = 'romeu' as const;

export interface RomeuQuickReply {
  label: string;
  input: string;
}

export const ROMEU_GREETINGS: RomeuQuickReply[] = [
  { label: 'Oi, Romeu!', input: 'Oi, Romeu! Pescou bem hoje?' },
  { label: 'Quero comprar peixe', input: 'Você tem peixe fresco para vender?' },
  { label: 'Conta uma história!', input: 'Me conta uma história de pesca, Romeu!' },
  { label: 'Como está o rio?', input: 'Como está o rio hoje, Romeu?' },
];

export const ROMEU_TOPICS: Record<string, RomeuQuickReply[]> = {
  general: [
    { label: 'Sobre o rio', input: 'Qual é o melhor lugar para pescar por aqui?' },
    { label: 'Sobre o Bento', input: 'Você e o Tio Bento costumam pescar juntos?' },
    { label: 'Histórias de pesca', input: 'Qual foi o maior peixe que você já pegou?' },
  ],
  fish: [
    { label: 'Peixe fresco', input: 'Quanto você pede pelo peixe fresco?' },
    { label: 'Peixe defumado', input: 'Você tem peixe defumado disponível?' },
    { label: 'Peixe raro', input: 'Já pegou algum peixe raro no rio?' },
  ],
};

export const ROMEU_SHOP_TRIGGER_PHRASES: string[] = [
  'posso te mostrar o peixe',
  'dá uma olhada na peixaria',
  'olha o que pesquei hoje',
  'pode escolher o que quer',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const ROMEU_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Pode deixar comigo! Esse rio não tem segredos pra mim, e esse serviço também não vai ter.',
    'Uai, que bom! Adoro quando alguém confia no Romeu. Já vou nessa!',
    'Tá feito! Tenho toda paciência do pescador pra essa tarefa.',
  ],
  working: [
    'Pescando com paciência... isso não se apressa não.',
    'Rio ensinou que todo bom resultado pede espera. Já já termino.',
    'Trabalhando com calma e jeito. Sou bom nisso, pode crer.',
  ],
  completed: [
    'Peguei! Missão cumprida, e ainda sobrou tempo pra uma pescaria!',
    'Pronto! Como o Romeu sempre diz: linha no lugar certo, peixe na mão.',
    'Acabou! Que nem um grande peixe: veio na hora certa.',
  ],
};

export const ROMEU_DIALOGUE = {
  npcId: ROMEU_NPC_ID,
  greetings: ROMEU_GREETINGS,
  topics: ROMEU_TOPICS,
  shopTriggerPhrases: ROMEU_SHOP_TRIGGER_PHRASES,
  choreDialogue: ROMEU_CHORE_DIALOGUE,
} as const;

export default ROMEU_DIALOGUE;
