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
];

export const DORINHA_TOPICS: Record<string, DorinhaQuickReply[]> = {
  general: [
    { label: 'Falar sobre a colheita', input: 'Qual foi a melhor safra que você já viu aqui?' },
    { label: 'Perguntar sobre Marina', input: 'Você e a Marina se conhecem há muito tempo?' },
    { label: 'Concorrência da cidade', input: 'Você tem medo de perder clientes para a cidade?' },
  ],
  selling: [
    { label: 'Vender trigo', input: 'Quanto você paga pelo trigo hoje?' },
    { label: 'Vender tomate', input: 'Preciso vender tomate. Você está comprando?' },
    { label: 'Vender milho', input: 'Você quer milho? Tenho um carregamento.' },
  ],
  seeds: [
    { label: 'Preço das sementes', input: 'Quanto custam as sementes de trigo agora?' },
    { label: 'O que plantar agora?', input: 'O que vale mais a pena plantar nessa época?' },
    { label: 'Tem desconto?', input: 'Você faz um preço especial para um amigo?' },
  ],
};

export const DORINHA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a quitanda',
  'posso te mostrar o que tenho',
  'dá uma olhada nas sementes',
  'pode escolher o que quer',
  'olha o meu estoque',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const DORINHA_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Pode deixar comigo! Não decepcionarei, não!',
    'Uai, que bom! Adoro quando me pedem algo de valor!',
    'Já sei o que fazer. Você pode contar com a Dorinha!',
  ],
  working: [
    'Tô no capricho, pode ficar tranquilo!',
    'Trabalhando firme, que nem todo dia na quitanda!',
    'Deixa que eu resolvo, já já termino!',
  ],
  completed: [
    'Pronto! Feito com todo amor e dedicação da sua Dorinha!',
    'Missão cumprida! Espero que fique satisfeito!',
    'Acabou! Pode conferir, não faltou nada!',
  ],
};

export const DORINHA_DIALOGUE = {
  npcId: DORINHA_NPC_ID,
  greetings: DORINHA_GREETINGS,
  topics: DORINHA_TOPICS,
  shopTriggerPhrases: DORINHA_SHOP_TRIGGER_PHRASES,
  choreDialogue: DORINHA_CHORE_DIALOGUE,
} as const;

export default DORINHA_DIALOGUE;
