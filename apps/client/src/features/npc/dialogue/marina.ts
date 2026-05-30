export const MARINA_NPC_ID = 'marina' as const;

export interface MarinaQuickReply {
  label: string;
  input: string;
}

export const MARINA_GREETINGS: MarinaQuickReply[] = [
  { label: 'Oi, Marina!', input: 'Oi, Marina! Como você está hoje?' },
  { label: 'Quero comprar pão', input: 'Você tem pão fresquinho para vender hoje?' },
  {
    label: 'Tem ingredientes?',
    input: 'Você precisa de algum ingrediente especial para a padaria?',
  },
  { label: 'Como vai a padaria?', input: 'Como está o movimento na padaria hoje?' },
];

export const MARINA_TOPICS: Record<string, MarinaQuickReply[]> = {
  baking: [
    { label: 'Receita favorita', input: 'Qual é a sua receita favorita de pão?' },
    { label: 'Ingredientes', input: 'Que ingredientes você mais usa na padaria?' },
    { label: 'Horário', input: 'Que horas a padaria abre todo dia?' },
  ],
  quests: [
    { label: 'Posso ajudar?', input: 'Você precisa de alguma ajuda aqui na padaria?' },
    { label: 'Buscar ingrediente', input: 'Tem algum ingrediente que você precisa que eu busque?' },
  ],
  info: [
    { label: 'Sobre a vila', input: 'O que você acha desta vila?' },
    { label: 'Sobre o Bento', input: 'Como está o Tio Bento?' },
    { label: 'Sobre a Lúcia', input: 'Como vai a Lúcia?' },
  ],
};

export const MARINA_SHOP_TRIGGER_PHRASES: string[] = [
  'pão fresquinho',
  'bolo de fubá',
  'produtos da padaria',
  'o que você tem para vender',
  'pode me mostrar o estoque',
];

export const MARINA_DIALOGUE = {
  npcId: MARINA_NPC_ID,
  greetings: MARINA_GREETINGS,
  topics: MARINA_TOPICS,
  shopTriggerPhrases: MARINA_SHOP_TRIGGER_PHRASES,
} as const;

export default MARINA_DIALOGUE;
