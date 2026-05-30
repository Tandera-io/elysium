export const BENTO_NPC_ID = 'bento' as const;

export interface BentoQuickReply {
  label: string;
  input: string;
}

export const BENTO_GREETINGS: BentoQuickReply[] = [
  { label: 'Oi, Bento!', input: 'Oi, Bento! Tudo certo?' },
  { label: 'Como vai a roça?', input: 'Como está sua roça hoje, Bento?' },
  { label: 'Preciso de conselho', input: 'Pode me dar um conselho sobre cultivo?' },
  { label: 'Novidades?', input: 'Tem alguma novidade no trabalho do campo?' },
];

export const BENTO_TOPICS: Record<string, BentoQuickReply[]> = {
  general: [
    { label: 'Sobre a fazenda', input: 'Há quanto tempo você trabalha nessa terra?' },
    { label: 'Sobre a safra', input: 'Qual foi a melhor safra que você já teve?' },
    { label: 'Parceria com Romeu', input: 'Você pesca junto com o Romeu às vezes?' },
  ],
  farming: [
    { label: 'Melhor plantio', input: 'Qual cultura você recomenda para o inicio da temporada?' },
    { label: 'Cuidado com praga', input: 'Como você combate pragas na lavoura?' },
    { label: 'Irrigação', input: 'Qual a melhor hora do dia para irrigar?' },
  ],
};

export const BENTO_SHOP_TRIGGER_PHRASES: string[] = [];

export const BENTO_DIALOGUE = {
  npcId: BENTO_NPC_ID,
  greetings: BENTO_GREETINGS,
  topics: BENTO_TOPICS,
  shopTriggerPhrases: BENTO_SHOP_TRIGGER_PHRASES,
} as const;

export default BENTO_DIALOGUE;
