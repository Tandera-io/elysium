/**
 * Dorinha's branching dialogue tree.
 *
 * Plain JS module — no TypeScript or framework dependencies — so it can be
 * used server-side, in tests, or bundled without a TS toolchain.
 *
 * The shape matches DialogueTree from stores/dialogueStore.ts:
 *   { start: string, nodes: Record<string, { text: string, choices: { text: string, next: string | null }[] }> }
 *
 * To trigger the dialogue from a React component use the choiceDialogueStore:
 *
 *   import { dorinhaDialogue } from './DorinhaDialogue';
 *   import { useChoiceDialogueStore } from '../stores/dialogueStore';
 *   useChoiceDialogueStore.getState().openDialogue('dorinha', 'Dorinha', dorinhaDialogue);
 */

/** @type {{ start: string, nodes: Record<string, { text: string, choices: { text: string, next: string|null }[] }> }} */
export const dorinhaDialogue = {
  start: 'greeting',
  nodes: {
    greeting: {
      text: 'Oi, oi! Bem-vindo à quitanda! Tenho os melhores produtos da região. O que você precisa hoje?',
      choices: [
        { text: 'Quero comprar sementes.', next: 'shop_offer' },
        { text: 'Tem alguma novidade?', next: 'news' },
        { text: 'Só vim dar um oi!', next: 'farewell' },
      ],
    },
    shop_offer: {
      text: 'Claro! Tenho sementes de trigo, tomate e milho fresquinhas. Aperta G pra ver minha loja!',
      choices: [{ text: 'Valeu, Dorinha!', next: null }],
    },
    news: {
      text: 'Ouvi dizer que a Marina tá plantando uma horta nova do outro lado do vilarejo. Vai ser linda!',
      choices: [
        { text: 'Que legal! Obrigado.', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    farewell: {
      text: 'Que bom te ver! Aparece mais vezes, tá? A quitanda tá sempre de portas abertas!',
      choices: [{ text: 'Com certeza, até logo!', next: null }],
    },
  },
};
