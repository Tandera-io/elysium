export const SOFIA_NPC_ID = 'sofia' as const;

export interface SofiaQuickReply {
  label: string;
  input: string;
}

export const SOFIA_GREETINGS: SofiaQuickReply[] = [
  { label: 'Oi, Sofia!', input: 'Oi, Sofia! Como estão os alunos?' },
  { label: 'Falar sobre educação', input: 'Qual é o maior desafio da escola aqui na vila?' },
  { label: 'Aprender algo novo', input: 'Você pode me ensinar algo sobre plantas medicinais?' },
  { label: 'Como vai a escola?', input: 'Como está a escola hoje, Sofia?' },
];

export const SOFIA_TOPICS: Record<string, SofiaQuickReply[]> = {
  general: [
    {
      label: 'Sobre o Padre Pedro',
      input: 'Você e o Padre Pedro colaboram muito pela comunidade, né?',
    },
    { label: 'Sobre a Marina', input: 'Você e a Marina se conhecem desde quando?' },
    { label: 'Aprender a ler', input: 'Você ensina adultos também, ou só crianças?' },
  ],
  learning: [
    {
      label: 'Plantas medicinais',
      input: 'Quais plantas medicinais devo cultivar na minha fazenda?',
    },
    { label: 'Matemática da roça', input: 'Como calcular o quanto plantar em cada época?' },
    { label: 'Ler o tempo', input: 'Tem como aprender a prever o tempo sem tecnologia?' },
  ],
  school: [
    { label: 'Ajudar a escola', input: 'Posso ajudar a escola de alguma forma?' },
    { label: 'Livros novos', input: 'A escola precisa de materiais novos?' },
    { label: 'Crianças da vila', input: 'Quantas crianças estudam aqui atualmente?' },
  ],
};

export const SOFIA_SHOP_TRIGGER_PHRASES: string[] = [];

export const SOFIA_DIALOGUE = {
  npcId: SOFIA_NPC_ID,
  greetings: SOFIA_GREETINGS,
  topics: SOFIA_TOPICS,
  shopTriggerPhrases: SOFIA_SHOP_TRIGGER_PHRASES,
} as const;

export default SOFIA_DIALOGUE;
