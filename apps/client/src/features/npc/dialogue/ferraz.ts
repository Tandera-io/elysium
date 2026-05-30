export const FERRAZ_NPC_ID = 'ferraz' as const;

export interface FerrazQuickReply {
  label: string;
  input: string;
}

export const FERRAZ_GREETINGS: FerrazQuickReply[] = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como estão os negócios?' },
  { label: 'Quero melhorar ferramenta', input: 'Você faz upgrade de ferramentas?' },
  { label: 'Quero comprar ferramenta', input: 'O que você tem pra vender hoje?' },
  { label: 'Como vai a ferraria?', input: 'Como está o movimento na ferraria?' },
];

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
  general: [
    { label: 'Falar sobre artesanato', input: 'Quanto tempo leva para forjar uma boa enxada?' },
    { label: 'Perguntar sobre Nina', input: 'Você conhece a Nina? Ela vende ferramentas também.' },
    { label: 'Sobre minério raro', input: 'Você trabalha com minério raro aqui na região?' },
    { label: 'Ferramentas e cuidado', input: 'Como eu cuido direito das minhas ferramentas?' },
  ],
  upgrades: [
    { label: 'Upgrade da enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Upgrade do regador', input: 'Você consegue melhorar um regador velho?' },
    {
      label: 'Forjar nova ferramenta',
      input: 'Quanto tempo leva para forjar uma ferramenta nova?',
    },
    { label: 'Upgrade da picareta', input: 'Você faz upgrade de picareta também?' },
  ],
  crafting: [
    { label: 'O que preciso para forja?', input: 'Quais materiais você precisa para trabalhar?' },
    { label: 'Sobre ferro e aço', input: 'Qual a diferença entre ferro e aço nas ferramentas?' },
    { label: 'Ferramentas especiais', input: 'Você faz alguma ferramenta especial sob encomenda?' },
    { label: 'Processo de forja', input: 'Como funciona o processo de forjar uma espada?' },
  ],
};

export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o estoque',
  'da uma olhada no que tenho',
  'pode escolher o que precisa',
  'olha as ferramentas aqui',
];

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
} as const;

export default FERRAZ_DIALOGUE;
