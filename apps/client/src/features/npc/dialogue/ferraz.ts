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
];

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
  ],
  upgrades: [
    { label: 'Melhorar enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Melhorar regador', input: 'Você consegue reforçar meu regador?' },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente.' },
  ],
  crafting: [
    { label: 'Forjar espada', input: 'Você forja armas também?' },
    {
      label: 'Materiais necessários',
      input: 'Que materiais você precisa para forjar algo especial?',
    },
    { label: 'Tempo de produção', input: 'Quanto tempo leva para forjar uma ferramenta nova?' },
  ],
};

/**
 * Unique dialogue options that reveal Ferraz's personality depth.
 * These go beyond shop interactions to build relationship and lore.
 */
export const FERRAZ_UNIQUE_DIALOGUES: FerrazQuickReply[] = [
  {
    label: 'Quem te ensinou o ofício?',
    input:
      'Ferraz, quem te ensinou a trabalhar com metal? Parece que você tem uma habilidade fora do comum.',
  },
  {
    label: 'Qual foi seu maior trabalho?',
    input:
      'Qual foi a peça mais difícil que você já forjou? Tenho curiosidade sobre seu melhor trabalho.',
  },
  {
    label: 'O que você acha do meu trabalho na fazenda?',
    input: 'Você tem visto meu progresso na fazenda. O que você acha do meu trabalho até agora?',
  },
  {
    label: 'Ferraria de noite',
    input:
      'Esses dias passei perto da ferraria de madrugada e vi luz lá dentro. Você trabalha até tarde?',
  },
  {
    label: 'Minério raro',
    input:
      'Ouvi dizer que existe minério especial nas montanhas daqui. Você já trabalhou com algum minério raro?',
  },
];

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
  uniqueDialogues: FERRAZ_UNIQUE_DIALOGUES,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
} as const;

export default FERRAZ_DIALOGUE;
