export const FERRAZ_NPC_ID = 'ferraz' as const;

export interface FerrazQuickReply {
  label: string;
  input: string;
}

export const FERRAZ_GREETINGS: FerrazQuickReply[] = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
  { label: 'Trouxe minério!', input: 'Trouxe um pouco de minério. Você aceita?' },
];

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
    { label: 'Parceria com Arnaldo', input: 'Você e o Arnaldo trabalham juntos às vezes?' },
    { label: 'O que mais gosta no ofício', input: 'O que te apaixona no trabalho de ferreiro?' },
  ],
  upgrades: [
    { label: 'Melhorar enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Melhorar regador', input: 'Você consegue reforçar meu regador?' },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente.' },
    {
      label: 'Vale a pena fazer upgrade?',
      input: 'Compensa mais melhorar a ferramenta ou comprar uma nova?',
    },
    { label: 'Quanto tempo leva?', input: 'Quanto tempo demora para fazer o upgrade?' },
  ],
  crafting: [
    { label: 'Forjar espada', input: 'Você forja armas também?' },
    {
      label: 'Materiais necessários',
      input: 'Que materiais você precisa para forjar algo especial?',
    },
    { label: 'Tempo de produção', input: 'Quanto tempo leva para forjar uma ferramenta nova?' },
    { label: 'Peça sob encomenda', input: 'Você faz peça especial sob encomenda?' },
    { label: 'O que você já forjou', input: 'Qual foi a peça mais difícil que você já forjou?' },
  ],
};

export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
];

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
} as const;

export default FERRAZ_DIALOGUE;
