export const PADRE_PEDRO_NPC_ID = 'padre_pedro' as const;

export interface PadrePedroQuickReply {
  label: string;
  input: string;
}

export const PADRE_PEDRO_GREETINGS: PadrePedroQuickReply[] = [
  { label: 'Bom dia, Padre!', input: 'Bom dia, Padre Pedro! Como o senhor está?' },
  { label: 'Preciso de conselho', input: 'Padre, preciso de um conselho.' },
  { label: 'Tem alguma missão?', input: 'Padre, posso ajudar a Igreja de alguma forma?' },
  { label: 'Falar sobre a vila', input: 'Como está a comunidade, Padre?' },
];

export const PADRE_PEDRO_TOPICS: Record<string, PadrePedroQuickReply[]> = {
  general: [
    { label: 'Bênção da colheita', input: 'O senhor pode abençoar minha plantação?' },
    { label: 'Festa do padroeiro', input: 'Quando é a festa do padroeiro da vila?' },
    { label: 'Moradores da vila', input: 'Quem mais frequenta a Igreja?' },
  ],
  quest: [
    { label: 'Ajudar a Igreja', input: 'Posso trazer algo que a Igreja precisa?' },
    { label: 'Doação de trigo', input: 'A Igreja precisa de trigo para o pão das missas?' },
    { label: 'Flores para o altar', input: 'Quais flores ficam bem no altar da Igreja?' },
  ],
  spiritual: [
    { label: 'Conselho de fé', input: 'Como manter a esperança nos dias difíceis?' },
    { label: 'História da vila', input: 'Padre, conta a história da nossa vila?' },
    { label: 'Sobre o perdão', input: 'Como o senhor vê o perdão entre as pessoas?' },
  ],
};

export const PADRE_PEDRO_QUEST_TRIGGER_PHRASES: string[] = [
  'você poderia trazer',
  'preciso de sua ajuda',
  'a Igreja precisa de',
  'se você conseguir trazer',
  'seria uma grande benção',
];

export const PADRE_PEDRO_DIALOGUE = {
  npcId: PADRE_PEDRO_NPC_ID,
  greetings: PADRE_PEDRO_GREETINGS,
  topics: PADRE_PEDRO_TOPICS,
  questTriggerPhrases: PADRE_PEDRO_QUEST_TRIGGER_PHRASES,
} as const;

export default PADRE_PEDRO_DIALOGUE;
