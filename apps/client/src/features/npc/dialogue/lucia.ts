export const LUCIA_NPC_ID = 'lucia' as const;

export interface LuciaQuickReply {
  label: string;
  input: string;
}

export const LUCIA_GREETINGS: LuciaQuickReply[] = [
  { label: 'Oi, Lúcia!', input: 'Oi, Lúcia! Tudo bem com os animais?' },
  { label: 'Comprar leite', input: 'Você tem leite fresco para vender hoje?' },
  { label: 'Comprar ovos', input: 'Tem ovos fresquinhos hoje?' },
  { label: 'Como vão os animais?', input: 'Como estão seus animais hoje?' },
];

export const LUCIA_TOPICS: Record<string, LuciaQuickReply[]> = {
  animals: [
    { label: 'Cuidar de animais', input: 'Como você cuida tão bem das suas vacas?' },
    { label: 'Animais especiais', input: 'Tem algum animal especial no seu estábulo?' },
    { label: 'Animais doentes', input: 'O que você faz quando um animal fica doente?' },
  ],
  quests: [
    { label: 'Posso ajudar?', input: 'Posso te ajudar com alguma coisa nos animais?' },
    { label: 'Ervas medicinais', input: 'Você precisa de ervas medicinais para os animais?' },
  ],
  info: [
    { label: 'Sobre a vila', input: 'O que você gosta mais aqui na vila?' },
    { label: 'Sobre o Bento', input: 'Como está o Bento?' },
    { label: 'Sobre a Marina', input: 'Como vai a Marina?' },
  ],
};

export const LUCIA_SHOP_TRIGGER_PHRASES: string[] = [
  'leite fresco',
  'ovos caipiras',
  'produtos do estábulo',
  'o que você tem para vender',
  'pode me mostrar',
];

export const LUCIA_DIALOGUE = {
  npcId: LUCIA_NPC_ID,
  greetings: LUCIA_GREETINGS,
  topics: LUCIA_TOPICS,
  shopTriggerPhrases: LUCIA_SHOP_TRIGGER_PHRASES,
} as const;

export default LUCIA_DIALOGUE;
