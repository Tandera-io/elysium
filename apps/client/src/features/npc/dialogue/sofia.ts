export const SOFIA_NPC_ID = 'sofia' as const;
export interface SofiaQuickReply {
  label: string;
  input: string;
}
export const SOFIA_GREETINGS = [
  { label: 'Oi, Sofia!', input: 'Oi, Sofia! Como você está?' },
  { label: 'Preciso de remédio', input: 'Você tem algum remédio natural?' },
  { label: 'Quero aprender', input: 'Você pode me ensinar sobre as ervas daqui?' },
  { label: 'Como está a botica?', input: 'Como está o movimento na botica?' },
];
export const SOFIA_TOPICS: Record<string, { label: string; input: string }[]> = {
  general: [
    { label: 'Sobre as ervas', input: 'Qual é a erva mais importante que você conhece?' },
    { label: 'Onde colher ervas', input: 'Onde você colhe as ervas melhores?' },
  ],
  remedies: [
    { label: 'Remédio para cansaço', input: 'Tem algo para dar energia depois de um dia pesado?' },
    { label: 'Poção especial', input: 'Você tem alguma poção especial?' },
  ],
};
export const SOFIA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a botica',
  'posso te mostrar os remédios',
];
export const SOFIA_DIALOGUE = {
  npcId: SOFIA_NPC_ID,
  greetings: SOFIA_GREETINGS,
  topics: SOFIA_TOPICS,
  shopTriggerPhrases: SOFIA_SHOP_TRIGGER_PHRASES,
} as const;
export default SOFIA_DIALOGUE;
