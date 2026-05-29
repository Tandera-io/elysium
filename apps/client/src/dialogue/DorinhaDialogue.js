/**
 * Dorinha's branching dialogue tree and UI entry point.
 *
 * Plain JS module — no TypeScript or framework dependencies for the tree data
 * itself — so it can be used server-side, in tests, or bundled without a TS
 * toolchain.
 *
 * The shape matches DialogueTree from stores/dialogueStore.ts:
 *   { start: string, nodes: Record<string, { text: string, choices: { text: string, next: string | null }[] }> }
 *
 * To trigger the dialogue from a React component use the choiceDialogueStore:
 *
 *   import { dorinhaDialogue } from './DorinhaDialogue';
 *   import { useChoiceDialogueStore } from '../stores/dialogueStore';
 *   useChoiceDialogueStore.getState().openDialogue('dorinha', 'Dorinha', dorinhaDialogue);
 *
 * DorinhaDialogueBox is re-exported here so App.tsx can import both from a
 * single path without knowing the internal file structure.
 */

/** @type {{ start: string, nodes: Record<string, { text: string, choices: { text: string, next: string|null }[] }> }} */
export const dorinhaDialogue = {
  start: 'greeting',
  nodes: {
    greeting: {
      text: 'Oi, oi! Bem-vindo à quitanda! Tenho os melhores produtos da região. O que você precisa hoje?',
      choices: [
        { text: 'Quero comprar sementes.', next: 'shop_offer' },
        { text: 'Tem alguma novidade por aqui?', next: 'news' },
        { text: 'Como vai a quitanda?', next: 'shop_status' },
        { text: 'Só vim dar um oi!', next: 'farewell' },
      ],
    },
    shop_offer: {
      text: 'Claro! Tenho sementes de trigo, tomate e milho fresquinhas. Aperta G pra ver minha loja completa!',
      choices: [
        { text: 'Ótimo, vou dar uma olhada!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    news: {
      text: 'Ouvi dizer que a Marina tá plantando uma horta nova do outro lado do vilarejo. Vai ser linda! Ah, e o Ferraz tá criando uma nova ferramenta pra colheita.',
      choices: [
        { text: 'Que interessante! Obrigado.', next: null },
        { text: 'Me conta mais sobre a Marina.', next: 'news_marina' },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    news_marina: {
      text: 'A Marina é a melhor horticultora do vilarejo! Dizem que os tomates dela crescem o dobro do tamanho. Deve ser o jeito especial que ela cuida da terra.',
      choices: [
        { text: 'Vou visitar ela logo!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    shop_status: {
      text: 'Tá indo bem, graças a Deus! Essa temporada a colheita foi generosa e as sementes estão em alta. Se você tiver produtos pra vender, passo bem!',
      choices: [
        { text: 'Que bom! Tenho algumas coisas pra vender.', next: 'sell_offer' },
        { text: 'Fico feliz em saber!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    sell_offer: {
      text: 'Perfeito! Aperta G pra abrir a loja e você pode vender suas colheitas por lá. Pago bem pelos produtos frescos!',
      choices: [
        { text: 'Ótimo, vou fazer isso!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    farewell: {
      text: 'Que bom te ver! Aparece mais vezes, tá? A quitanda tá sempre de portas abertas pra você!',
      choices: [{ text: 'Com certeza, até logo, Dorinha!', next: null }],
    },
  },
};

// Re-export the container component so App.tsx can import DorinhaDialogueBox
// from this single entry-point path.
export { ChoiceDialogueBox as DorinhaDialogueBox } from '../ui/ChoiceDialogueBox';
