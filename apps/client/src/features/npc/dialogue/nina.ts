export const NINA_NPC_ID = 'nina' as const;

export interface NinaQuickReply {
  label: string;
  input: string;
}

export const NINA_GREETINGS: NinaQuickReply[] = [
  { label: 'Oi, Nina!', input: 'Oi, Nina! Como você está?' },
  { label: 'Quero comprar ferramenta', input: 'Você tem ferramentas para vender?' },
  { label: 'Quero sementes especiais', input: 'Quais sementes você tem disponíveis?' },
  { label: 'Como vai o negócio?', input: 'Como está o movimento na ferragem?' },
  { label: 'Novidade no estoque?', input: 'Chegou alguma ferramenta nova, Nina?' },
];

export const NINA_TOPICS: Record<string, NinaQuickReply[]> = {
  general: [
    { label: 'Dica de plantio', input: 'Qual ferramenta é essencial para plantar bem?' },
    { label: 'Perguntar sobre Bento', input: 'O Tio Bento compra muito aqui?' },
    { label: 'Manutenção de ferramentas', input: 'Como faço para conservar minha enxada?' },
    { label: 'Sobre a vida aqui', input: 'Como é trabalhar na ferragem aqui na comunidade?' },
    {
      label: 'Ferramenta quebrada',
      input: 'Você conserta ferramentas estragadas ou só vende nova?',
    },
  ],
  tools: [
    { label: 'Comprar regador', input: 'Quanto custa o regador? Meu velho estragou.' },
    { label: 'Comprar enxada', input: 'Você tem enxada boa para terreno duro?' },
    { label: 'Comprar adubo', input: 'Que tipo de adubo você recomenda para hortaliças?' },
    { label: 'Ferramenta mais vendida', input: 'Qual ferramenta sai mais aqui na ferragem?' },
    {
      label: 'Enxada ou picareta?',
      input: 'Para começar uma roça nova, é melhor enxada ou picareta?',
    },
  ],
  seeds: [
    { label: 'Sementes de abóbora', input: 'Quer dizer que você vende sementes de abóbora?' },
    {
      label: 'Sementes de morango',
      input: 'Tenho interesse em morango. Quanto custam as sementes?',
    },
    { label: 'Melhor época de plantar', input: 'Qual é a melhor época para plantar morango aqui?' },
    { label: 'Semente rara', input: 'Você tem alguma semente mais difícil de encontrar?' },
    { label: 'Quantidade mínima', input: 'Qual a quantidade mínima de sementes que você vende?' },
  ],
};

export const NINA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferragem',
  'posso te mostrar o estoque',
  'dá uma olhada nas ferramentas',
  'pode escolher o que precisa',
  'olha o que tenho aqui',
];

export const NINA_DIALOGUE = {
  npcId: NINA_NPC_ID,
  greetings: NINA_GREETINGS,
  topics: NINA_TOPICS,
  shopTriggerPhrases: NINA_SHOP_TRIGGER_PHRASES,
} as const;

export default NINA_DIALOGUE;
