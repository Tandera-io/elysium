export const FERRAZ_NPC_ID = 'ferraz' as const;
export interface FerrazQuickReply {
  label: string;
  input: string;
}
export const FERRAZ_GREETINGS = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
];
export const FERRAZ_TOPICS: Record<string, { label: string; input: string }[]> = {
  general: [
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
  ],
  upgrades: [
    { label: 'Melhorar enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Melhorar regador', input: 'Você consegue reforçar meu regador?' },
  ],
};
export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
];
export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
} as const;
export default FERRAZ_DIALOGUE;
