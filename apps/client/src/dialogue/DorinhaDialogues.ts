/**
 * DorinhaDialogues — predefined dialogue lines for Dorinha, the seed merchant.
 *
 * Used as a fallback when ANTHROPIC_API_KEY is not configured, and as a
 * reference for Dorinha's personality when generating live dialogue.
 *
 * Dorinha is an enthusiastic seed-seller who loves plants, good harvests, and
 * fair trades. She's knowledgeable about agriculture and speaks casually in
 * Brazilian Portuguese.
 */

export interface DorinhaDialogueLine {
  id: string;
  text: string;
  /** Mood/emotion to display in the UI. */
  emotion: 'neutral' | 'happy' | 'excited' | 'annoyed' | 'sad';
  /** Optional follow-up choices for the player. */
  choices?: Array<{ id: string; text: string; next: string }>;
}

/** Greeting lines — triggered on first interaction each in-game day. */
export const DORINHA_GREETINGS: DorinhaDialogueLine[] = [
  {
    id: 'greet_morning',
    text: 'Bom dia! Chegou cedo hoje, né? As melhores sementes somem rápido, sabia?',
    emotion: 'happy',
    choices: [
      { id: 'c1', text: 'Quero ver o que você tem.', next: 'shop' },
      { id: 'c2', text: 'Só passei pra dar oi.', next: 'chat' },
    ],
  },
  {
    id: 'greet_midday',
    text: 'Oi! Tô aqui suando, mas as sementes tão fresquinhas! O que você precisar, é só falar.',
    emotion: 'happy',
    choices: [
      { id: 'c1', text: 'Me mostra as sementes.', next: 'shop' },
      { id: 'c2', text: 'Como vai o negócio?', next: 'chat_business' },
    ],
  },
  {
    id: 'greet_afternoon',
    text: 'Boa tarde! Plantou alguma coisa hoje? Tenho umas sementes de tomate que tão pedindo pra ir pro chão!',
    emotion: 'excited',
    choices: [
      { id: 'c1', text: 'Vamos ver essas sementes.', next: 'shop' },
      { id: 'c2', text: 'Ainda não plantei nada.', next: 'chat_tip' },
    ],
  },
];

/** Follow-up dialogue nodes (keyed by node id). */
export const DORINHA_DIALOGUES: Record<string, DorinhaDialogueLine> = {
  chat: {
    id: 'chat',
    text: 'Que bom! Faz diferença, sabe? Às vezes o pessoal passa corrido sem dar bom dia… Mas você é gente boa.',
    emotion: 'happy',
    choices: [{ id: 'c1', text: 'Até logo, Dorinha!', next: 'farewell' }],
  },

  chat_business: {
    id: 'chat_business',
    text: 'Tá indo! Hoje vendí umas sementes de milho cedo. Esse povo da aldeia tá começando a plantar mais — bom sinal!',
    emotion: 'excited',
    choices: [{ id: 'c1', text: 'Que ótimo! Até logo.', next: 'farewell' }],
  },

  chat_tip: {
    id: 'chat_tip',
    text: 'Não espera demais, não! Tomate gosta de começar cedo na estação. Você planta hoje, daqui a uns dias já tá colhendo.',
    emotion: 'neutral',
    choices: [
      { id: 'c1', text: 'Bom saber. Me mostra as sementes.', next: 'shop' },
      { id: 'c2', text: 'Valeu pela dica!', next: 'farewell' },
    ],
  },

  shop: {
    id: 'shop',
    text: 'Claro! Tenho trigo, tomate e milho. Tudo fresquinho, plantado com carinho. O que vai levar?',
    emotion: 'excited',
    choices: [{ id: 'c1', text: 'Vou dar uma olhada. (Abre loja)', next: '__open_shop__' }],
  },

  gift_liked: {
    id: 'gift_liked',
    text: 'Ei, você trouxe isso pra mim?! Adoro! Obrigada de verdade — vai ser muito útil aqui na loja.',
    emotion: 'happy',
    choices: [{ id: 'c1', text: 'De nada, Dorinha!', next: 'farewell' }],
  },

  gift_disliked: {
    id: 'gift_disliked',
    text: 'Ah… fica com isso, tá? Não tenho muito uso aqui na loja. Mas foi gentil da sua parte.',
    emotion: 'annoyed',
    choices: [{ id: 'c1', text: 'Tudo bem, até logo.', next: 'farewell' }],
  },

  drought_worry: {
    id: 'drought_worry',
    text: 'Tô preocupada com o tempo… Seca prolongada é o pesadelo de qualquer sementeira. Reza pra chover logo.',
    emotion: 'sad',
    choices: [{ id: 'c1', text: 'Vai ficar tudo bem.', next: 'farewell' }],
  },

  pest_worry: {
    id: 'pest_worry',
    text: 'Olha, cuidado com as pragas esse ano. Tô ouvindo falar de lagartas na região. Fique de olho nas suas plantas!',
    emotion: 'annoyed',
    choices: [
      { id: 'c1', text: 'Obrigado pelo aviso!', next: 'farewell' },
      { id: 'c2', text: 'Tem algum remédio pra isso?', next: 'pest_advice' },
    ],
  },

  pest_advice: {
    id: 'pest_advice',
    text: 'Olha, o mais natural é plantar manjericão perto. Afasta muita praga. Agora pra caso grave, você vai ter que comprar adubo especial.',
    emotion: 'neutral',
    choices: [{ id: 'c1', text: 'Ótima dica, valeu!', next: 'farewell' }],
  },

  farewell: {
    id: 'farewell',
    text: 'Até mais! Se precisar de sementes, já sabe onde me achar. Boas colheitas!',
    emotion: 'happy',
  },
};

/**
 * Returns a greeting line appropriate for the current in-game hour.
 * Falls back to the midday greeting if no match is found.
 */
export function getDorinhaGreeting(hour: number): DorinhaDialogueLine {
  if (hour >= 5 && hour < 11) return DORINHA_GREETINGS[0]!;
  if (hour >= 11 && hour < 15) return DORINHA_GREETINGS[1]!;
  return DORINHA_GREETINGS[2]!;
}

/**
 * Returns a dialogue line by node id, or undefined if not found.
 */
export function getDorinhaDialogue(nodeId: string): DorinhaDialogueLine | undefined {
  return DORINHA_DIALOGUES[nodeId];
}
