export const MARINA_NPC_ID = 'marina' as const;

export interface MarinaQuickReply {
  label: string;
  input: string;
}

export const MARINA_GREETINGS: MarinaQuickReply[] = [
  { label: 'Oi, Marina!', input: 'Oi, Marina! Tudo bem com você?' },
  { label: 'Quero comprar pão', input: 'Você tem pão fresquinho para vender hoje?' },
  { label: 'Tenho trigo para vender', input: 'Marina, trouxe trigo para você. Aceita?' },
  { label: 'Cheirinho bom!', input: 'Marina, que cheiro maravilhoso vindo da padaria!' },
];

export const MARINA_TOPICS: Record<string, MarinaQuickReply[]> = {
  general: [
    { label: 'Conversar sobre pão', input: 'Marina, qual é o segredo do seu pão tão gostoso?' },
    { label: 'Perguntar sobre a padaria', input: 'Como está indo a padaria? Movimento bom?' },
    {
      label: 'Perguntar sobre Bento',
      input: 'Você e o Bento se dão bem? Ele parece tão carrancudo...',
    },
  ],
  recipes: [
    { label: 'Receita de bolo fubá', input: 'Você pode me ensinar a receita do bolo fubá?' },
    {
      label: 'Ingredientes especiais',
      input: 'Você usa algum ingrediente especial nos seus pães?',
    },
    { label: 'Pão mais difícil', input: 'Qual é o pão mais difícil de fazer?' },
  ],
  ingredients: [
    {
      label: 'Precisa de trigo?',
      input: 'Você está precisando de trigo? Posso trazer da minha roça.',
    },
    { label: 'Compra ovos?', input: 'Você compra ovos? Tenho galinhas em casa.' },
    { label: 'Aceita leite?', input: 'Aceita leite fresco? A Lucia tem bastante.' },
  ],
};

export const MARINA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a padaria',
  'posso te mostrar o que tenho',
  'dá uma olhada no que assei',
  'pode escolher um pão',
  'olha o que saiu do forno',
];

export const MARINA_DIALOGUE = {
  npcId: MARINA_NPC_ID,
  greetings: MARINA_GREETINGS,
  topics: MARINA_TOPICS,
  shopTriggerPhrases: MARINA_SHOP_TRIGGER_PHRASES,
} as const;

export default MARINA_DIALOGUE;
