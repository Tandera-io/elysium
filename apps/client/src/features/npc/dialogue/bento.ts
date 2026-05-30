export const BENTO_NPC_ID = 'bento' as const;

export interface BentoQuickReply {
  label: string;
  input: string;
}

export const BENTO_GREETINGS: BentoQuickReply[] = [
  { label: 'Bom dia, Tio Bento!', input: 'Bom dia, Tio Bento! Como vai o campo?' },
  { label: 'Como está a safra?', input: 'E aí, Bento? Como está a safra este ano?' },
  {
    label: 'Preciso de conselho',
    input: 'Tio Bento, você tem um conselho para um fazendeiro novo?',
  },
  { label: 'O que está plantando?', input: 'O que você está plantando agora, Bento?' },
];

export const BENTO_TOPICS: Record<string, BentoQuickReply[]> = {
  general: [
    { label: 'Sobre a terra', input: 'O que você mais gosta nessa vida no campo?' },
    { label: 'Sabedoria rural', input: 'Qual o melhor provérbio que seu pai te ensinou?' },
    { label: 'Sobre o clima', input: 'Como você sabe quando vai chover, Bento?' },
  ],
  farming: [
    { label: 'Dica de plantio', input: 'Qual a melhor época para plantar trigo por aqui?' },
    { label: 'Cuidar do solo', input: 'Como você prepara o solo antes de plantar?' },
    { label: 'Comprar trigo', input: 'Você vende trigo? Quanto você pede?' },
  ],
  tools: [
    {
      label: 'Melhor ferramenta',
      input: 'Qual é a ferramenta mais importante para um fazendeiro?',
    },
    { label: 'Conservar ferramentas', input: 'Como você cuida das suas ferramentas, Bento?' },
    { label: 'Sobre a lenha', input: 'Você tem lenha para vender?' },
  ],
};

export const BENTO_SHOP_TRIGGER_PHRASES: string[] = [
  'posso te mostrar o que tenho',
  'olha o que colhi',
  'pode escolher o que quer',
];

export const BENTO_DIALOGUE = {
  npcId: BENTO_NPC_ID,
  greetings: BENTO_GREETINGS,
  topics: BENTO_TOPICS,
  shopTriggerPhrases: BENTO_SHOP_TRIGGER_PHRASES,
} as const;

export default BENTO_DIALOGUE;
