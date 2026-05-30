export const PADRE_PEDRO_NPC_ID = 'padre-pedro' as const;

export interface PadrePedroQuickReply {
  label: string;
  input: string;
}

export const PADRE_PEDRO_GREETINGS: PadrePedroQuickReply[] = [
  { label: 'Bom dia, Padre!', input: 'Bom dia, Padre Pedro! Como vai a paróquia?' },
  { label: 'Preciso de conselho', input: 'Padre, preciso de um conselho sobre algo importante.' },
  { label: 'Falar sobre a comunidade', input: 'Como estão as famílias da vila, Padre Pedro?' },
  { label: 'Pedir uma bênção', input: 'Padre, o senhor poderia abençoar minha colheita?' },
];

export const PADRE_PEDRO_TOPICS: Record<string, PadrePedroQuickReply[]> = {
  general: [
    { label: 'Falar sobre a fé', input: 'O que a fé tem a ver com a vida na roça, Padre?' },
    {
      label: 'Perguntar sobre a Sofia',
      input: 'Você e a professora Sofia trabalham juntos pela educação?',
    },
    { label: 'Tradições da vila', input: 'Quais são as festas religiosas mais importantes aqui?' },
  ],
  spiritual: [
    {
      label: 'Pedir bênção para safra',
      input: 'Padre, poderia abençoar minhas sementes antes de plantar?',
    },
    {
      label: 'Buscar orientação',
      input: 'Estou passando por um momento difícil. Pode me orientar?',
    },
    { label: 'Sobre a missa', input: 'Em que horário é a próxima missa, Padre Pedro?' },
  ],
  community: [
    { label: 'Ajudar alguém na vila', input: 'Tem alguém na comunidade que precisa de ajuda?' },
    { label: 'Festas da paróquia', input: 'Quando é a próxima festa junina da paróquia?' },
    { label: 'História da vila', input: 'Você pode me contar a história desta vila, Padre?' },
  ],
};

export const PADRE_PEDRO_SHOP_TRIGGER_PHRASES: string[] = [];

export const PADRE_PEDRO_DIALOGUE = {
  npcId: PADRE_PEDRO_NPC_ID,
  greetings: PADRE_PEDRO_GREETINGS,
  topics: PADRE_PEDRO_TOPICS,
  shopTriggerPhrases: PADRE_PEDRO_SHOP_TRIGGER_PHRASES,
} as const;

export default PADRE_PEDRO_DIALOGUE;
