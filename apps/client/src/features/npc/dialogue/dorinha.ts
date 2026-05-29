/**
 * Dorinha NPC dialogue — greetings and trade quick-choice prompts.
 * Used by DialogueBox to pre-populate conversation starters.
 */

/** Greeting lines Dorinha cycles through at the start of a conversation. */
export const DORINHA_GREETINGS = [
  'Oi, chegou na hora certa! Tenho sementes fresquinhas pra você hoje.',
  'Eita, que bom te ver! O que você quer da quitanda hoje?',
  'Boa! Tô aqui esperando. Quer comprar ou vender alguma coisa?',
  'Pode chegar, pode chegar! A quitanda tá aberta.',
  'Olá! Colheita boa hoje? Posso comprar suas culturas pelo preço certo.',
];

/** Quick-choice prompts shown as buttons in the dialogue UI. */
export const DORINHA_CHOICES = [
  {
    id: 'sell_crops',
    label: 'Quero vender minhas culturas',
    message: 'Quero vender minhas culturas hoje. Quanto você paga por elas?',
  },
  {
    id: 'buy_seeds',
    label: 'Comprar sementes',
    message: 'O que você tem de sementes disponíveis? Quero comprar.',
  },
  {
    id: 'prices',
    label: 'Quais são os preços?',
    message: 'Quais são os preços das suas sementes e culturas hoje?',
  },
  {
    id: 'trade',
    label: 'Trocar produtos',
    message: 'Posso trocar minhas culturas por sementes diferentes?',
  },
];

/** Returns a random greeting from the list. */
export function getDorinhaGreeting() {
  return DORINHA_GREETINGS[Math.floor(Math.random() * DORINHA_GREETINGS.length)];
}
