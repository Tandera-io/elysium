export const ARNALDO_NPC_ID = 'arnaldo' as const;

export interface ArnaldoQuickReply {
  label: string;
  input: string;
}

export const ARNALDO_GREETINGS: ArnaldoQuickReply[] = [
  { label: 'Oi, Arnaldo!', input: 'Oi, Arnaldo! Como vai o armazém?' },
  { label: 'Quero comprar farinha', input: 'Você tem farinha disponível hoje?' },
  { label: 'Quero vender colheita', input: 'Você compra trigo e milho?' },
  { label: 'Como vai o negócio?', input: 'Como está o movimento no armazém?' },
];

export const ARNALDO_TOPICS: Record<string, ArnaldoQuickReply[]> = {
  general: [
    { label: 'Falar sobre estoque', input: 'O que está em falta no armazém ultimamente?' },
    { label: 'Perguntar sobre Dorinha', input: 'A Dorinha é sua principal fornecedora, não é?' },
    { label: 'Dica de negócio', input: 'Qual produto vale mais a pena vender agora?' },
  ],
  buying: [
    { label: 'Vender trigo', input: 'Quanto você paga pelo trigo hoje?' },
    { label: 'Vender milho', input: 'Você está comprando milho?' },
    { label: 'Vender feijão', input: 'Tenho feijão pra vender. Topa?' },
  ],
  products: [
    { label: 'Comprar farinha', input: 'Quanto custa um saco de farinha?' },
    { label: 'Comprar feijão', input: 'Você tem feijão preto ou carioca?' },
    { label: 'Preço do milho', input: 'O milho está a quanto o quilo?' },
  ],
};

export const ARNALDO_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir o armazém',
  'pode me mostrar o estoque',
  'dá uma olhada no que tem',
  'me mostra o que você tem',
  'olha o estoque do armazém',
];

export const ARNALDO_DIALOGUE = {
  npcId: ARNALDO_NPC_ID,
  greetings: ARNALDO_GREETINGS,
  topics: ARNALDO_TOPICS,
  shopTriggerPhrases: ARNALDO_SHOP_TRIGGER_PHRASES,
} as const;

export default ARNALDO_DIALOGUE;
