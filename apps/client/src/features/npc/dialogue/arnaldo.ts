export const ARNALDO_NPC_ID = 'arnaldo' as const;

export interface ArnaldoQuickReply {
  label: string;
  input: string;
}

export const ARNALDO_GREETINGS: ArnaldoQuickReply[] = [
  { label: 'Oi, Arnaldo!', input: 'Oi, Arnaldo! Tudo certo?' },
  { label: 'Preciso de madeira', input: 'Você vende madeira trabalhada?' },
  { label: 'Quero uma cerca', input: 'Você consegue fazer uma cerca para minha fazenda?' },
  { label: 'Como vai o trabalho?', input: 'Como está a marcenaria, Arnaldo?' },
];

export const ARNALDO_TOPICS: Record<string, ArnaldoQuickReply[]> = {
  general: [
    { label: 'Sobre a marcenaria', input: 'Há quanto tempo você trabalha com madeira?' },
    { label: 'Parceria com Ferraz', input: 'Você e o Ferraz trabalham juntos?' },
    { label: 'Madeira local', input: 'Qual é a melhor madeira que você encontra aqui?' },
  ],
  woodwork: [
    { label: 'Comprar prancha', input: 'Quanto custa uma prancha de madeira boa?' },
    { label: 'Comprar cerca', input: 'Quanto você cobra por uma cerca?' },
    { label: 'Encomenda especial', input: 'Você faz peças sob encomenda?' },
  ],
  quests: [
    {
      label: 'Tem algum pedido?',
      input: 'Arnaldo, precisa de algum material? Posso te ajudar a conseguir.',
    },
    {
      label: 'Posso te ajudar?',
      input: 'Tô disponível para te fazer um favor. Falta algum material na marcenaria?',
    },
    {
      label: 'Missão disponível?',
      input: 'Tem alguma tarefa que eu possa fazer para você, Arnaldo?',
    },
  ],
};

export const ARNALDO_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a marcenaria',
  'posso te mostrar o estoque',
  'dá uma olhada na madeira',
  'pode escolher o que precisa',
];

export const ARNALDO_DIALOGUE = {
  npcId: ARNALDO_NPC_ID,
  greetings: ARNALDO_GREETINGS,
  topics: ARNALDO_TOPICS,
  shopTriggerPhrases: ARNALDO_SHOP_TRIGGER_PHRASES,
} as const;

export default ARNALDO_DIALOGUE;
