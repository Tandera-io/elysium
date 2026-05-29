export const DORINHA_ID = 'dorinha';

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}

export const DORINHA_DIALOGUE_ENTRY = 'greeting';

export const DORINHA_DIALOGUE: Record<string, DialogueNode> = {
  greeting: {
    text: 'Ei, chegou na hora! Tô com muita coisa boa hoje. O que você precisa?',
    choices: [
      { id: 'shop', text: 'Quero comprar sementes.', next: 'shop_offer' },
      { id: 'sell', text: 'Vim vender minha colheita.', next: 'sell_offer' },
      { id: 'chat', text: 'Só vim dar um oi.', next: 'chat' },
      { id: 'farewell', text: 'Até logo!', next: null },
    ],
  },
  shop_offer: {
    text: 'Tenho semente de trigo, tomate e milho — tudo fresquinho! O que leva?',
    choices: [
      { id: 'buy_wheat', text: 'Semente de trigo.', next: 'confirm_wheat' },
      { id: 'buy_tomato', text: 'Semente de tomate.', next: 'confirm_tomato' },
      { id: 'buy_corn', text: 'Semente de milho.', next: 'confirm_corn' },
      { id: 'back', text: 'Deixa, obrigado.', next: 'farewell' },
    ],
  },
  sell_offer: {
    text: 'Trago o melhor preço da região! Me mostra o que você colheu.',
    choices: [{ id: 'back', text: 'Vou pensar melhor.', next: 'farewell' }],
  },
  chat: {
    text: 'Boa safra essa temporada, hein? A Marina me disse que você tá caprichando na roça!',
    choices: [
      { id: 'agree', text: 'É, tô me esforçando!', next: 'encouragement' },
      { id: 'modest', text: 'Ainda tô aprendendo...', next: 'advice' },
      { id: 'farewell', text: 'Até mais!', next: null },
    ],
  },
  encouragement: {
    text: 'Isso aí! Gente trabalhadora que faz a comunidade crescer. Pode contar comigo!',
    choices: [{ id: 'farewell', text: 'Até logo, Dorinha!', next: null }],
  },
  advice: {
    text: 'Todo mundo começa do zero. Dica: começa com trigo. Rápido de crescer e sempre tem comprador!',
    choices: [{ id: 'thanks', text: 'Obrigado pela dica!', next: 'farewell' }],
  },
  confirm_wheat: {
    text: 'Semente de trigo. Boa escolha — cresce em qualquer estação!',
    choices: [
      { id: 'buy_more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  confirm_tomato: {
    text: 'Tomate fresquinho! Vai bem no verão. Cuida bem da água, viu?',
    choices: [
      { id: 'buy_more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  confirm_corn: {
    text: 'Milho! Todo mundo ama. Planta em fileira que cresce melhor.',
    choices: [
      { id: 'buy_more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  farewell: {
    text: 'Volta sempre! Qualquer coisa, tô aqui na quitanda.',
    choices: [{ id: 'close', text: 'Tchau, Dorinha!', next: null }],
  },
};

export interface ScheduleSlot {
  fromHour: number;
  toHour: number;
  pos: { x: number; z: number };
}

// Dorinha's daily movement: quitanda 07-12, casa 12-14, quitanda 14-18, rest 18-07
export const DORINHA_SCHEDULE: ScheduleSlot[] = [
  { fromHour: 7, toHour: 12, pos: { x: 6, z: 4 } },
  { fromHour: 12, toHour: 14, pos: { x: 2, z: 8 } },
  { fromHour: 14, toHour: 18, pos: { x: 6, z: 4 } },
  { fromHour: 18, toHour: 24, pos: { x: 2, z: 8 } },
  { fromHour: 0, toHour: 7, pos: { x: 2, z: 8 } },
];
