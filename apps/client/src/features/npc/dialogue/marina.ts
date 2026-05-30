export const MARINA_NPC_ID = 'marina' as const;

export interface MarinaQuickReply {
  label: string;
  input: string;
}

export const MARINA_GREETINGS: MarinaQuickReply[] = [
  { label: 'Bom dia, Marina!', input: 'Bom dia, Marina! Como você está?' },
  { label: 'Quero comprar pão', input: 'Você tem pão fresquinho hoje?' },
  { label: 'Cheira bem aqui!', input: 'Nossa, que cheiro bom! O que você está assando?' },
  { label: 'Novidades da vila?', input: 'O que está acontecendo por aqui, Marina?' },
];

export const MARINA_TOPICS: Record<string, MarinaQuickReply[]> = {
  general: [
    { label: 'Sobre a padaria', input: 'Há quanto tempo você tem a padaria?' },
    { label: 'Sobre a família', input: 'Me conta um pouco sobre sua família, Marina.' },
    { label: 'Fofoca da vila', input: 'Tem alguma novidade interessante na vila?' },
  ],
  bread: [
    { label: 'Comprar pão francês', input: 'Quanto custa o pão francês?' },
    { label: 'Comprar bolo de fubá', input: 'Você tem bolo de fubá? Adoro!' },
    { label: 'Receita de pão', input: 'Qual é o segredo do seu pão tão gostoso?' },
  ],
  farming: [
    { label: 'Precisa de trigo', input: 'Você compra trigo, Marina?' },
    { label: 'Precisa de leite', input: 'Você usa leite nas receitas? Posso vender.' },
    { label: 'Sobre os ingredientes', input: 'De onde vêm os ingredientes da sua padaria?' },
  ],
};

export const MARINA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a padaria',
  'posso te mostrar o pão',
  'dá uma olhada no que tenho',
  'pode escolher o que quer',
  'olha o que assei hoje',
];

export const MARINA_DIALOGUE = {
  npcId: MARINA_NPC_ID,
  greetings: MARINA_GREETINGS,
  topics: MARINA_TOPICS,
  shopTriggerPhrases: MARINA_SHOP_TRIGGER_PHRASES,
} as const;

export default MARINA_DIALOGUE;
