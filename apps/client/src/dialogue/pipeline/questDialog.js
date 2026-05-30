// apps/client/src/dialogue/pipeline/questDialog.js
//
// Quest dialogue pipeline — hand-authored dialogue flows for offering and
// completing quests.  Used by NPCDialogue and DialogueBox to surface quest
// offers, acceptance confirmations, and turn-in rewards for each NPC.
//
// Design notes:
//   - Each NPC has three dialogue sections:
//       offer    — lines shown when the NPC proposes the quest
//       accept   — NPC's reaction when the player clicks "Aceitar"
//       complete — NPC's reaction when the player turns in the items
//   - Lines are arrays; the first element is always shown in the dialogue
//     widget.  Future versions may chain them into a multi-step sequence.
//   - All text is in Portuguese to match the game locale.
//
// Exported surface:
//   QUEST_DIALOGUES                — full map keyed by npcId
//   getQuestOfferLine(npcId)       — NPC's initial offer pitch
//   getQuestAcceptLine(npcId)      — NPC's reaction when player accepts
//   getQuestCompleteLine(npcId)    — NPC's thank-you on turn-in
//   getQuestDialogue(npcId, phase) — generic selector by phase key

// ---------------------------------------------------------------------------
// Dialogue data
// ---------------------------------------------------------------------------

/**
 * @typedef {'offer' | 'accept' | 'complete'} QuestPhase
 */

/**
 * Full quest dialogue map.
 * @type {Record<string, Record<QuestPhase, string[]>>}
 */
export const QUEST_DIALOGUES = {
  nina: {
    offer: [
      'Você poderia me trazer uns trigos? Estou testando uma nova técnica para conservar ferramentas e o trigo serve de base para o verniz.',
      'Preciso de trigo com urgência — tenho um experimento de lubrificante que pode durar a vida toda! Me ajuda?',
    ],
    accept: [
      'Que alívio! Contava com você mesmo. Assim que trouxer, vou mostrar o processo.',
      'Ótimo! Sei que posso confiar no seu trabalho. Pode trazer quando estiver pronto.',
    ],
    complete: [
      'Perfeito! Exatamente o que precisava. Aqui a sua recompensa — e minha gratidão eterna.',
      'Incrível, você foi rápida! Muito obrigada. Aqui estão suas moedas, bem merecidas.',
    ],
  },

  dorinha: {
    offer: [
      'Poxa, tô precisando de tomates urgente! A safra da semana acabou e tenho clientes esperando. Me ajuda com alguns?',
      'Oi! Você tá colhendo tomate na fazenda? Precisaria de uns para repor o estoque da quitanda.',
    ],
    accept: [
      'Sabia que podia contar com você! Me avisa quando tiver pronto, tô aqui.',
      'Ótimo! Obrigada de verdade. Quando você trouxer, pago na hora e sem enrolação.',
    ],
    complete: [
      'Uau, tão rápido! Aqui seu pagamento, certinho. Muito obrigada, salvou o dia!',
      'Perfeito! Produto fresquinho, do jeito que a quitanda precisa. Valeu mesmo — aqui a grana!',
    ],
  },

  marina: {
    offer: [
      'Ai, precisaria de mais trigo para fazer o pão da semana. Tá acabando e os clientes ficam tristes sem o pão francês. Você me ajuda?',
      'Querida, estou com pouco trigo e o forno vai ficar parado. Me traz uns trigos? Pagarei bem.',
    ],
    accept: [
      'Nossa, que alívio! Obrigada de coração. Sei que você vai conseguir, tenho fé!',
      'Bênção! Sabia que você ia ajudar. Pode tomar o seu tempo, aguardo aqui na padaria.',
    ],
    complete: [
      'Ai, que maravilha! Vai ser muito útil. Aqui sua recompensa, você não imagina quanto me ajudou.',
      'Perfeito! Obrigada, meu bem. Já posso fazer o pão de amanhã. Aqui as suas moedas!',
    ],
  },

  bento: {
    offer: [
      'Preciso de tomates. Estou fazendo um ensopado pra semana e acabou o estoque. Você me traz?',
      'Ei. Tô precisando de tomates. Produção própria não tá dando. Você planta, me ajuda?',
    ],
    accept: [
      'Bom. Esperava isso de você. Pode ir, conheço seu trabalho.',
      'Tá. Pode ir. Quando tiver pronto, é só trazer aqui.',
    ],
    complete: [
      'Feito direitinho. Rápido — gosto disso. Aqui o combinado.',
      'Produto bom. Obrigado. Aqui sua parte, certinho.',
    ],
  },

  lucia: {
    offer: [
      'Oi! Tô precisando de leite extra essa semana pra alimentar os bezerros novos. Você consegue me ajudar?',
      'Os animais tão precisando de mais leite! Se você tiver, me vende alguns? Seria uma mão na roda.',
    ],
    accept: [
      'Obrigada! Sabia que você ia ajudar. Os animais agradecem também!',
      'Que alívio! Os bichos vão ficar tão felizes. Me avisa quando tiver pronto.',
    ],
    complete: [
      'Que maravilha! Obrigada, você salvou o dia. Aqui sua recompensa, com carinho.',
      'Perfeito! Exatamente o que precisava. Aqui sua recompensa — e um abraço dos bichos!',
    ],
  },
};

/** Fallback lines when NPC id is unknown. */
const FALLBACK = {
  offer: ['Preciso de uma coisa... você poderia me ajudar?'],
  accept: ['Obrigado por aceitar! Conto com você.'],
  complete: ['Muito obrigado! Aqui sua recompensa.'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a pseudo-random entry from an array, seeded by interaction count so
 * repeated visits feel varied but the same visit stays consistent.
 *
 * @param {string[]} arr
 * @param {number} [seed]
 * @returns {string}
 */
function pick(arr, seed = 0) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.abs(seed) % arr.length];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the NPC's opening quest-offer line.
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number }} [context]
 * @returns {string}
 */
export function getQuestOfferLine(npcId, context = {}) {
  const lines = QUEST_DIALOGUES[npcId]?.offer ?? FALLBACK.offer;
  return pick(lines, context.interactionCount ?? 0);
}

/**
 * Returns the NPC's reaction when the player clicks "Aceitar".
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number }} [context]
 * @returns {string}
 */
export function getQuestAcceptLine(npcId, context = {}) {
  const lines = QUEST_DIALOGUES[npcId]?.accept ?? FALLBACK.accept;
  return pick(lines, context.interactionCount ?? 0);
}

/**
 * Returns the NPC's thank-you line when items are turned in.
 *
 * @param {string} npcId
 * @param {{ interactionCount?: number }} [context]
 * @returns {string}
 */
export function getQuestCompleteLine(npcId, context = {}) {
  const lines = QUEST_DIALOGUES[npcId]?.complete ?? FALLBACK.complete;
  return pick(lines, context.interactionCount ?? 0);
}

/**
 * Generic selector — returns the NPC's line for any quest phase.
 *
 * @param {string} npcId
 * @param {QuestPhase} phase  — 'offer' | 'accept' | 'complete'
 * @param {{ interactionCount?: number }} [context]
 * @returns {string}
 */
export function getQuestDialogue(npcId, phase, context = {}) {
  switch (phase) {
    case 'offer':
      return getQuestOfferLine(npcId, context);
    case 'accept':
      return getQuestAcceptLine(npcId, context);
    case 'complete':
      return getQuestCompleteLine(npcId, context);
    default:
      return pick(FALLBACK[phase] ?? ['...'], context.interactionCount ?? 0);
  }
}
