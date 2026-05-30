export const LUCIA_NPC_ID = 'lucia' as const;

export interface LuciaQuickReply {
  label: string;
  input: string;
}

export const LUCIA_GREETINGS: LuciaQuickReply[] = [
  { label: 'Oi, Tia Lúcia!', input: 'Oi, Tia Lúcia! Tudo bem com você?' },
  { label: 'Como estão os animais?', input: 'Tia Lúcia, como estão as vacas e as galinhas?' },
  { label: 'Quero comprar leite', input: 'Você tem leite fresco hoje, Tia Lúcia?' },
  { label: 'Você está bem?', input: 'Você parece animada hoje, Tia Lúcia!' },
];

export const LUCIA_TOPICS: Record<string, LuciaQuickReply[]> = {
  general: [
    { label: 'Sobre os animais', input: 'Quantos animais você cuida aqui na fazenda?' },
    { label: 'Sobre o Bento', input: 'O Tio Bento está ajudando com os animais?' },
    { label: 'Sobre a Marina', input: 'Você e a Marina são amigas há muito tempo?' },
  ],
  products: [
    { label: 'Comprar leite', input: 'Quanto custa o litro de leite?' },
    { label: 'Comprar ovos', input: 'Você vende ovos também? Quantos você tem?' },
    { label: 'Receita com leite', input: 'O que a Marina faz com o seu leite?' },
  ],
  animals: [
    { label: 'Como cuidar de vaca', input: 'Como você cuida das suas vacas, Tia Lúcia?' },
    { label: 'Criar galinhas', input: 'É difícil criar galinhas? Me ensina!' },
    { label: 'Animal favorito', input: 'Qual é o seu animal favorito aqui da fazenda?' },
  ],
};

export const LUCIA_SHOP_TRIGGER_PHRASES: string[] = [
  'posso te mostrar o que tenho',
  'olha o que tenho fresquinho',
  'pode escolher o que quer',
  'dá uma olhada nos produtos',
];

export const LUCIA_DIALOGUE = {
  npcId: LUCIA_NPC_ID,
  greetings: LUCIA_GREETINGS,
  topics: LUCIA_TOPICS,
  shopTriggerPhrases: LUCIA_SHOP_TRIGGER_PHRASES,
} as const;

export default LUCIA_DIALOGUE;
