export const SOFIA_NPC_ID = 'sofia' as const;

export interface SofiaQuickReply {
  label: string;
  input: string;
}

export const SOFIA_GREETINGS: SofiaQuickReply[] = [
  { label: 'Oi, Sofia!', input: 'Oi, Sofia! Como você está?' },
  { label: 'Preciso de remédio', input: 'Você tem algum remédio natural?' },
  { label: 'Quero aprender', input: 'Você pode me ensinar sobre as ervas daqui?' },
  { label: 'Como está a botica?', input: 'Como está o movimento na botica?' },
  {
    label: 'Trouxe ervas!',
    input: 'Sofia, eu trouxe algumas ervas que achei no campo. Você compra?',
  },
];

export const SOFIA_TOPICS: Record<string, SofiaQuickReply[]> = {
  general: [
    { label: 'Sobre as ervas', input: 'Qual é a erva mais importante que você conhece?' },
    { label: 'Sobre a Lucia', input: 'Você e a Lucia são amigas há muito tempo?' },
    { label: 'Onde colher ervas', input: 'Onde você colhe as ervas melhores?' },
    { label: 'Como aprendeu', input: 'Como você aprendeu tudo sobre plantas medicinais?' },
    { label: 'Erva mais rara', input: 'Qual é a erva mais difícil de encontrar por aqui?' },
  ],
  remedies: [
    { label: 'Remédio para cansaço', input: 'Tem algo para dar energia depois de um dia pesado?' },
    {
      label: 'Remédio para safra',
      input: 'Existe algo que ajude as plantas a crescer mais fortes?',
    },
    { label: 'Poção especial', input: 'Você tem alguma poção especial?' },
    {
      label: 'Remédio para animal doente',
      input: 'Tem algum remédio natural para animal que está fraco?',
    },
    { label: 'O que evitar na roça', input: 'Tem alguma planta por aqui que faz mal às culturas?' },
  ],
};

export const SOFIA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a botica',
  'posso te mostrar os remédios',
  'dá uma olhada nas ervas',
  'pode escolher o que precisa',
  'olha o que tenho aqui',
];

export const SOFIA_DIALOGUE = {
  npcId: SOFIA_NPC_ID,
  greetings: SOFIA_GREETINGS,
  topics: SOFIA_TOPICS,
  shopTriggerPhrases: SOFIA_SHOP_TRIGGER_PHRASES,
} as const;

export default SOFIA_DIALOGUE;
