export const LUCIA_NPC_ID = 'lucia' as const;

export interface LuciaQuickReply {
  label: string;
  input: string;
}

export const LUCIA_GREETINGS: LuciaQuickReply[] = [
  { label: 'Oi, Lucia!', input: 'Oi, Lucia! Como você está?' },
  { label: 'Como estão os animais?', input: 'Como estão os seus animais hoje?' },
  { label: 'Tem leite fresco?', input: 'Você tem leite fresco hoje?' },
  { label: 'Precisa de ajuda?', input: 'Posso ajudar com alguma coisa no curral?' },
];

export const LUCIA_TOPICS: Record<string, LuciaQuickReply[]> = {
  general: [
    { label: 'Sobre os animais', input: 'Qual animal você mais gosta de cuidar?' },
    { label: 'Sobre a criação', input: 'Há quanto tempo você cria animais?' },
    { label: 'Sobre a Sofia', input: 'A Sofia te ajuda com os animais doentes?' },
  ],
  animals: [
    { label: 'Cuidado com vaca', input: 'Como você cuida da saúde das vacas?' },
    { label: 'Produção de lã', input: 'Quando é a época de tosquiar as ovelhas?' },
    { label: 'Animais felizes', input: 'O que você faz para deixar os animais felizes?' },
  ],
};

export const LUCIA_SHOP_TRIGGER_PHRASES: string[] = [];

export const LUCIA_DIALOGUE = {
  npcId: LUCIA_NPC_ID,
  greetings: LUCIA_GREETINGS,
  topics: LUCIA_TOPICS,
  shopTriggerPhrases: LUCIA_SHOP_TRIGGER_PHRASES,
} as const;

export default LUCIA_DIALOGUE;
