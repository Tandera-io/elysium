export const ROMEU_NPC_ID = 'romeu' as const;
export interface RomeuQuickReply {
  label: string;
  input: string;
}
export const ROMEU_GREETINGS = [
  { label: 'Oi, Romeu!', input: 'Oi, Romeu! Pescou bem hoje?' },
  { label: 'Quero comprar peixe', input: 'Você tem peixe fresco para vender?' },
  { label: 'Conta uma história!', input: 'Me conta uma história de pesca, Romeu!' },
  { label: 'Como está o rio?', input: 'Como está o rio hoje, Romeu?' },
];
export const ROMEU_TOPICS: Record<string, { label: string; input: string }[]> = {
  general: [
    { label: 'Sobre o rio', input: 'Qual é o melhor lugar para pescar por aqui?' },
    { label: 'Histórias de pesca', input: 'Qual foi o maior peixe que você já pegou?' },
  ],
  fish: [
    { label: 'Peixe fresco', input: 'Quanto você pede pelo peixe fresco?' },
    { label: 'Peixe defumado', input: 'Você tem peixe defumado disponível?' },
  ],
};
export const ROMEU_SHOP_TRIGGER_PHRASES: string[] = [
  'posso te mostrar o peixe',
  'dá uma olhada na peixaria',
];
export const ROMEU_DIALOGUE = {
  npcId: ROMEU_NPC_ID,
  greetings: ROMEU_GREETINGS,
  topics: ROMEU_TOPICS,
  shopTriggerPhrases: ROMEU_SHOP_TRIGGER_PHRASES,
} as const;
export default ROMEU_DIALOGUE;
