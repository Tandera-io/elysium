export const BENTO_NPC_ID = 'bento' as const;

export interface BentoQuickReply {
  label: string;
  input: string;
}

export const BENTO_GREETINGS: BentoQuickReply[] = [
  { label: 'Oi, Bento!', input: 'Oi, Bento! Tudo bem com a lavoura?' },
  { label: 'Conselho de roça', input: 'Tem algum conselho pra minha lavoura?' },
  { label: 'Comprar trigo', input: 'Você tem trigo para vender?' },
  { label: 'Como vai a terra?', input: 'Como está a sua lavoura hoje?' },
];

export const BENTO_TOPICS: Record<string, BentoQuickReply[]> = {
  farming: [
    { label: 'Melhor época', input: 'Qual é a melhor época para plantar aqui na região?' },
    { label: 'Irrigação', input: 'Como você irriga sua lavoura na época seca?' },
    { label: 'Controle de pragas', input: 'Como você lida com pragas na roça?' },
  ],
  quests: [
    { label: 'Posso ajudar?', input: 'Você precisa de ajuda com alguma coisa na roça?' },
    { label: 'Buscar material', input: 'Precisa de algum material que eu possa conseguir?' },
  ],
  info: [
    { label: 'Sobre a vila', input: 'Você conhece bem a história desta vila?' },
    { label: 'Sobre a Marina', input: 'Como vai sua sobrinha Marina?' },
    { label: 'Sobre a Lúcia', input: 'Como está a Lúcia?' },
  ],
};

export const BENTO_SHOP_TRIGGER_PHRASES: string[] = [
  'trigo para vender',
  'produto da roça',
  'o que você tem para vender',
  'pode me mostrar',
];

export const BENTO_DIALOGUE = {
  npcId: BENTO_NPC_ID,
  greetings: BENTO_GREETINGS,
  topics: BENTO_TOPICS,
  shopTriggerPhrases: BENTO_SHOP_TRIGGER_PHRASES,
} as const;

export default BENTO_DIALOGUE;
