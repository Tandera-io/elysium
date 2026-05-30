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
  { label: 'Me ensina a pescar!', input: 'Você me ensina a pescar, Romeu?' },
];

export const ROMEU_TOPICS: Record<string, RomeuQuickReply[]> = {
  general: [
    { label: 'Sobre o rio', input: 'Qual é o melhor lugar para pescar por aqui?' },
    { label: 'Sobre o Bento', input: 'Você e o Tio Bento costumam pescar juntos?' },
    { label: 'Histórias de pesca', input: 'Qual foi o maior peixe que você já pegou?' },
    { label: 'Como começou', input: 'Como você aprendeu a pescar, Romeu?' },
    { label: 'Melhor hora para pescar', input: 'Qual é a melhor hora do dia para pescar no rio?' },
  ],
  fish: [
    { label: 'Peixe fresco', input: 'Quanto você pede pelo peixe fresco?' },
    { label: 'Peixe defumado', input: 'Você tem peixe defumado disponível?' },
    { label: 'Peixe raro', input: 'Já pegou algum peixe raro no rio?' },
    { label: 'Que peixe tem mais?', input: 'Qual tipo de peixe tem mais no rio agora?' },
    { label: 'Como conservar peixe', input: 'Qual a melhor forma de conservar o peixe fresco?' },
  ],
};

export const ROMEU_SHOP_TRIGGER_PHRASES: string[] = [
  'posso te mostrar o peixe',
  'dá uma olhada na peixaria',
  'olha o que pesquei hoje',
  'pode escolher o que quer',
];

export const ROMEU_DIALOGUE = {
  npcId: ROMEU_NPC_ID,
  greetings: ROMEU_GREETINGS,
  topics: ROMEU_TOPICS,
  shopTriggerPhrases: ROMEU_SHOP_TRIGGER_PHRASES,
} as const;

export default ROMEU_DIALOGUE;
