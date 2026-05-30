export const DORINHA_NPC_ID = 'dorinha' as const;

export interface DorinhaQuickReply {
  label: string;
  input: string;
}

export const DORINHA_GREETINGS: DorinhaQuickReply[] = [
  { label: 'Oi, Dorinha!', input: 'Oi, Dorinha! Tudo bem?' },
  { label: 'Quero comprar sementes', input: 'Você tem sementes para vender hoje?' },
  { label: 'Quero vender safra', input: 'Você compra colheita? Tenho trigo, tomate e milho.' },
  { label: 'Como vai o negócio?', input: 'Como está o movimento na quitanda?' },
  { label: 'Notícias da comunidade?', input: 'Alguma novidade por aqui, Dorinha?' },
];

export const DORINHA_TOPICS: Record<string, DorinhaQuickReply[]> = {
  general: [
    { label: 'Falar sobre a colheita', input: 'Qual foi a melhor safra que você já viu aqui?' },
    { label: 'Perguntar sobre Marina', input: 'Você e a Marina se conhecem há muito tempo?' },
    { label: 'Concorrência da cidade', input: 'Você tem medo de perder clientes para a cidade?' },
    { label: 'Sobre o Tio Bento', input: 'O Tio Bento vende safra para você?' },
    { label: 'Festa da comunidade', input: 'Vai ter alguma festa na comunidade em breve?' },
  ],
  selling: [
    { label: 'Vender trigo', input: 'Quanto você paga pelo trigo hoje?' },
    { label: 'Vender tomate', input: 'Preciso vender tomate. Você está comprando?' },
    { label: 'Vender milho', input: 'Você quer milho? Tenho um carregamento.' },
    { label: 'Melhor preço para quê?', input: 'Qual colheita você está pagando mais agora?' },
    {
      label: 'Vender em lote',
      input: 'Você dá desconto se eu vender uma carga grande de uma vez?',
    },
  ],
  seeds: [
    { label: 'Preço das sementes', input: 'Quanto custam as sementes de trigo agora?' },
    { label: 'O que plantar agora?', input: 'O que vale mais a pena plantar nessa época?' },
    { label: 'Tem desconto?', input: 'Você faz um preço especial para um amigo?' },
    { label: 'Semente de tomate', input: 'Qual é a melhor semente de tomate que você tem?' },
    { label: 'Guardar semente', input: 'Como devo guardar as sementes para não estragar?' },
  ],
};

export const DORINHA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a quitanda',
  'posso te mostrar o que tenho',
  'dá uma olhada nas sementes',
  'pode escolher o que quer',
  'olha o meu estoque',
];

export const DORINHA_DIALOGUE = {
  npcId: DORINHA_NPC_ID,
  greetings: DORINHA_GREETINGS,
  topics: DORINHA_TOPICS,
  shopTriggerPhrases: DORINHA_SHOP_TRIGGER_PHRASES,
} as const;

export default DORINHA_DIALOGUE;
