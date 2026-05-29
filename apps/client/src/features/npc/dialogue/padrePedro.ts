export const PADRE_PEDRO_NPC_ID = 'padrePedro' as const;

export interface PadrePedroQuickReply {
  label: string;
  input: string;
}

export const PADRE_PEDRO_GREETINGS: PadrePedroQuickReply[] = [
  { label: 'Bom dia, Padre!', input: 'Bom dia, Padre Pedro! Como vai?' },
  {
    label: 'Quero uma bênção',
    input: 'Padre Pedro, poderia me dar uma bênção para minha lavoura?',
  },
  {
    label: 'Bênção das ferramentas',
    input: 'Padre, pode abençoar minhas ferramentas de trabalho?',
  },
  {
    label: 'Conselhos de fé',
    input: 'Padre Pedro, que conselho o senhor daria para um fazendeiro?',
  },
];

export const PADRE_PEDRO_TOPICS: Record<string, PadrePedroQuickReply[]> = {
  general: [
    { label: 'Sobre a fazenda', input: 'O que o senhor acha desta fazenda, Padre?' },
    { label: 'Sobre a comunidade', input: 'Como está a comunidade, Padre Pedro?' },
    { label: 'Sobre as estações', input: 'Qual a estação do ano favorita do senhor, Padre?' },
  ],
  blessings: [
    { label: 'Bênção da colheita', input: 'Padre, abençoe minha próxima colheita, por favor.' },
    { label: 'Bênção das sementes', input: 'Pode abençoar as sementes antes de eu plantar?' },
    { label: 'Bênção da chuva', input: 'Rezemos juntos para que venha chuva boa para as plantas?' },
  ],
  wisdom: [
    {
      label: 'Provérbio da terra',
      input: 'Tem algum provérbio sobre a terra e o trabalho, Padre?',
    },
    {
      label: 'Paciência e colheita',
      input: 'Como manter paciência quando a colheita demora, Padre?',
    },
    { label: 'Gratidão', input: 'Como o senhor pratica gratidão pelos dons da terra?' },
  ],
};

export const PADRE_PEDRO_DIALOGUE = {
  npcId: PADRE_PEDRO_NPC_ID,
  greetings: PADRE_PEDRO_GREETINGS,
  topics: PADRE_PEDRO_TOPICS,
} as const;

export default PADRE_PEDRO_DIALOGUE;
