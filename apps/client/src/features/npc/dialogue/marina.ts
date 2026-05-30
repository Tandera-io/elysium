export const MARINA_NPC_ID = 'marina' as const;

export interface MarinaQuickReply {
  label: string;
  input: string;
}

export const MARINA_GREETINGS: MarinaQuickReply[] = [
  { label: 'Oi, Marina!', input: 'Oi, Marina! Tudo bem?' },
  { label: 'Tem pão fresquinho?', input: 'Você tem pão saindo do forno agora?' },
  { label: 'Precisa de algo?', input: 'Você está precisando de algum ingrediente da roça?' },
  { label: 'Como vai a padaria?', input: 'Como está o movimento na padaria hoje?' },
];

export const MARINA_TOPICS: Record<string, MarinaQuickReply[]> = {
  general: [
    { label: 'Sobre a padaria', input: 'Há quanto tempo você tem a padaria?' },
    { label: 'Sobre a roça', input: 'Qual ingrediente da roça é mais importante para você?' },
    { label: 'Sobre a Dorinha', input: 'Você e a Dorinha se conhecem de longa data?' },
  ],
  farming: [
    { label: 'Precisa de trigo?', input: 'Você quer que eu plante trigo para você?' },
    { label: 'Precisa de tomate?', input: 'Você usa tomate nos seus produtos? Posso cultivar.' },
    { label: 'Melhor safra', input: 'Qual foi a melhor safra que você se lembra por aqui?' },
  ],
};

export const MARINA_SHOP_TRIGGER_PHRASES: string[] = [];

export const MARINA_DIALOGUE = {
  npcId: MARINA_NPC_ID,
  greetings: MARINA_GREETINGS,
  topics: MARINA_TOPICS,
  shopTriggerPhrases: MARINA_SHOP_TRIGGER_PHRASES,
} as const;

export default MARINA_DIALOGUE;
