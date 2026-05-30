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
];

export const NINA_TOPICS: Record<string, NinaQuickReply[]> = {
  general: [
    { label: 'Dica de plantio', input: 'Qual ferramenta é essencial para plantar bem?' },
    { label: 'Perguntar sobre Bento', input: 'O Tio Bento compra muito aqui?' },
    { label: 'Manutenção de ferramentas', input: 'Como faço para conservar minha enxada?' },
  ],
  tools: [
    { label: 'Comprar regador', input: 'Quanto custa o regador? Meu velho estragou.' },
    { label: 'Comprar enxada', input: 'Você tem enxada boa para terreno duro?' },
    { label: 'Comprar adubo', input: 'Que tipo de adubo você recomenda para hortaliças?' },
  ],
  seeds: [
    { label: 'Sementes de abóbora', input: 'Quer dizer que você vende sementes de abóbora?' },
    {
      label: 'Sementes de morango',
      input: 'Tenho interesse em morango. Quanto custam as sementes?',
    },
    { label: 'Melhor época de plantar', input: 'Qual é a melhor época para plantar morango aqui?' },
  ],
  quests: [
    {
      label: 'Tem algum pedido?',
      input: 'Você precisa de algum produto? Posso te ajudar a conseguir.',
    },
    {
      label: 'Posso te ajudar?',
      input: 'Tô disponível para te fazer um favor. Precisa de algum material?',
    },
    {
      label: 'Missão disponível?',
      input: 'Tem algo que você precisaria que eu fosse buscar pra você?',
    },
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
