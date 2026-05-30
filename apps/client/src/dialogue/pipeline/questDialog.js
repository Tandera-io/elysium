// apps/client/src/dialogue/pipeline/questDialog.js
//
// Quest dialogue helpers — build contextual dialogue lines for quest
// interactions (offer, accept, progress check, turn-in).
//
// These are hand-authored fallback lines used when the Anthropic API is
// unavailable (same pattern as the rest of this pipeline).  The NPC
// interaction system calls these to inject quest state into greetings.
//
// Exported surface:
//   buildQuestOfferLines(quest, npcName)   — what NPC says when offering
//   buildQuestProgressLines(quest, have)   — mid-quest check-in
//   buildQuestReadyLines(quest, npcName)   — player is ready to turn in
//   buildQuestRewardLines(quest)           — after turn-in, reward delivered
//   getQuestDialogue(phase, quest, ctx)    — single-entry dispatch

import { PLAYER_ACTIONS } from './index';

export { PLAYER_ACTIONS };

// ---------------------------------------------------------------------------
// Hand-authored quest dialogue lines
// Keyed by npcId → phase → line variants
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, string[]>>} */
const QUEST_LINES = {
  nina: {
    offer: [
      'Preciso de ajuda! Será que você consegue me trazer {quantity}× {item}? Pago bem.',
      'Oi! Tô precisando de {quantity} unidades de {item} com urgência. Você toparia?',
      'Que bom que você veio. Precisava de alguém de confiança para me buscar {quantity}× {item}.',
    ],
    progress: [
      'Você já tem {have} de {quantity} {item}. Quase lá!',
      'Continua assim! Faltam só {remaining} {item}.',
      'Animada pra ver você trazer o resto! {have}/{quantity} {item} até agora.',
    ],
    ready: [
      'Que coisa boa! Você conseguiu os {item}! Vem cá, vem receber sua recompensa.',
      'Uau, conseguiu os {quantity} {item}! Pode trazer, estou pronta para pagar.',
      'Perfeito! Você trouxe tudo! Me dá aqui e receba o que é seu.',
    ],
    reward: [
      'Incrível! Aqui estão suas {rewardCash} moedas. Muito obrigada de verdade!',
      'Pronto! {rewardCash} moedas para você. Pode contar comigo quando precisar.',
      'Toma! {rewardCash} moedas, combinado cumprido. Valeu demais!',
    ],
  },

  dorinha: {
    offer: [
      'Ei! Tô precisando de {quantity}× {item} pro estoque. Você consegue trazer?',
      'Olha, se você me trouxer {quantity} unidades de {item}, te pago direito.',
      'Precisando urgente de {quantity} {item}. Você me ajuda? Tem recompensa garantida.',
    ],
    progress: [
      '{have} de {quantity} {item} — continua! Você tá indo bem.',
      'Faltam {remaining} {item}. Pode continuar que eu tô aqui esperando.',
      'Metade do caminho feito! {have}/{quantity} {item}.',
    ],
    ready: [
      'Você conseguiu os {item}! Vem aqui receber o pagamento.',
      'Que rápido! Pode vir buscar suas {rewardCash} moedas.',
      'Tá tudo certo? Traz aqui os {item} e eu te pago na hora.',
    ],
    reward: [
      'Aqui está! {rewardCash} moedas no bolso. Obrigada!',
      'Pago certinho: {rewardCash} moedas. Fez um ótimo trabalho!',
      'Pronto! {rewardCash} moedas. Pode voltar quando quiser pra outro pedido.',
    ],
  },

  marina: {
    offer: [
      'Meu bem, você poderia me trazer {quantity}× {item}? Tô precisando muito.',
      'Ah, que bom que veio! Precisava de {quantity} {item} com urgência. Você topa?',
      'Você não me salvaria trazendo {quantity} unidades de {item}? Pago bem!',
    ],
    progress: [
      'Você já tem {have}! Falta pouco. {remaining} {item} e termina.',
      'Obrigada por não esquecer! {have} de {quantity} {item} já.',
      'Tô contando com você. {have}/{quantity} {item} até agora — ótimo!',
    ],
    ready: [
      'Acabou! Você trouxe os {item}! Que alívio! Venha pegar sua recompensa.',
      'Nossa Senhora! Você conseguiu os {quantity} {item}? Que bênção!',
      'Que maravilha! Traz aqui os {item} e eu te dou o que combinamos.',
    ],
    reward: [
      'Aqui estão suas {rewardCash} moedas. Deus te abençoe!',
      '{rewardCash} moedas para você, meu bem. Muito obrigada!',
      'Toma, toma! {rewardCash} moedas. Você não imagina o quanto me ajudou.',
    ],
  },

  bento: {
    offer: [
      'Preciso de {quantity}× {item}. Você consegue? Pago o combinado.',
      'Tô com falta de {item}. Me traz {quantity} unidades?',
      '{quantity} {item}. Você consegue isso? Te pago bem.',
    ],
    progress: [
      '{have}/{quantity} {item}. Continua.',
      'Falta {remaining}. Vai indo.',
      'Você tá cumprindo. {have} de {quantity} {item}.',
    ],
    ready: [
      'Conseguiu. Traz aqui os {item}.',
      'Pronto então. Traz o {item} e recebe o pagamento.',
      'Ok. {quantity} {item} — pode vir buscar o que é seu.',
    ],
    reward: [
      '{rewardCash} moedas. Feito.',
      'Toma. {rewardCash}. Bom trabalho.',
      'Aqui o combinado. {rewardCash} moedas.',
    ],
  },

  lucia: {
    offer: [
      'Você poderia me trazer {quantity}× {item}? Os bichos precisam!',
      'Olha, precisando muito de {quantity} {item}. Me ajuda?',
      'Que bom te ver! Eu precisava de {quantity} {item} com urgência.',
    ],
    progress: [
      'Você tem {have} de {quantity} {item}. Os bichos agradecem!',
      'Falta {remaining} {item}. Você tá indo super bem!',
      '{have}/{quantity} — quase lá! Os animais tão contando com você.',
    ],
    ready: [
      'Você conseguiu os {item}! Que maravilha! Vem pegar sua recompensa.',
      'Os animais vão ficar tão felizes! Traz os {item} aqui.',
      'Incrível! Você trouxe tudo! Vem receber o que você merece.',
    ],
    reward: [
      '{rewardCash} moedas! Os bichos mandam beijo.',
      'Aqui sua recompensa: {rewardCash} moedas. Muito obrigada!',
      'Toma, {rewardCash} moedas. Você fez a diferença aqui hoje!',
    ],
  },
};

const FALLBACK_LINES = {
  offer: ['Preciso de {quantity}× {item}. Você toparia me ajudar? Recompensa garantida.'],
  progress: ['Você tem {have} de {quantity} {item}. Continua!'],
  ready: ['Você conseguiu! Venha receber sua recompensa.'],
  reward: ['Aqui sua recompensa: {rewardCash} moedas. Obrigado!'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {string[]} lines
 * @param {number} seed
 * @returns {string}
 */
function pick(lines, seed = 0) {
  if (!lines || lines.length === 0) return '';
  return lines[Math.abs(seed) % lines.length];
}

/**
 * Fill template placeholders in a dialogue line.
 *
 * @param {string} template
 * @param {Record<string, string|number>} vars
 * @returns {string}
 */
function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a dialogue line for the NPC offering a quest to the player.
 *
 * @param {import('../../systems/quest/questDefs').Quest} quest
 * @param {{ npcId: string, seed?: number }} ctx
 * @returns {string}
 */
export function buildQuestOfferLines(quest, ctx = {}) {
  const { npcId = quest.giverNpcId, seed = 0 } = ctx;
  const lines = QUEST_LINES[npcId]?.offer ?? FALLBACK_LINES.offer;
  return fill(pick(lines, seed), {
    quantity: quest.quantity,
    item: quest.item,
    rewardCash: quest.rewardCash,
  });
}

/**
 * Build a progress check-in line mid-quest.
 *
 * @param {import('../../systems/quest/questDefs').Quest} quest
 * @param {number} have  — how many the player already has
 * @param {{ npcId?: string, seed?: number }} ctx
 * @returns {string}
 */
export function buildQuestProgressLines(quest, have, ctx = {}) {
  const { npcId = quest.giverNpcId, seed = 0 } = ctx;
  const lines = QUEST_LINES[npcId]?.progress ?? FALLBACK_LINES.progress;
  return fill(pick(lines, seed), {
    have,
    quantity: quest.quantity,
    remaining: Math.max(0, quest.quantity - have),
    item: quest.item,
  });
}

/**
 * Build a line for when the player is ready to turn in the quest.
 *
 * @param {import('../../systems/quest/questDefs').Quest} quest
 * @param {{ npcId?: string, seed?: number }} ctx
 * @returns {string}
 */
export function buildQuestReadyLines(quest, ctx = {}) {
  const { npcId = quest.giverNpcId, seed = 0 } = ctx;
  const lines = QUEST_LINES[npcId]?.ready ?? FALLBACK_LINES.ready;
  return fill(pick(lines, seed), {
    quantity: quest.quantity,
    item: quest.item,
    rewardCash: quest.rewardCash,
  });
}

/**
 * Build a reward-delivery line after the quest is turned in.
 *
 * @param {import('../../systems/quest/questDefs').Quest} quest
 * @param {{ npcId?: string, seed?: number }} ctx
 * @returns {string}
 */
export function buildQuestRewardLines(quest, ctx = {}) {
  const { npcId = quest.giverNpcId, seed = 0 } = ctx;
  const lines = QUEST_LINES[npcId]?.reward ?? FALLBACK_LINES.reward;
  return fill(pick(lines, seed), {
    quantity: quest.quantity,
    item: quest.item,
    rewardCash: quest.rewardCash,
  });
}

/**
 * Single dispatch for quest dialogue — returns the appropriate line based on
 * which phase of the quest interaction is happening.
 *
 * @param {'offer'|'progress'|'ready'|'reward'} phase
 * @param {import('../../systems/quest/questDefs').Quest} quest
 * @param {{ npcId?: string, seed?: number, have?: number }} ctx
 * @returns {string}
 */
export function getQuestDialogue(phase, quest, ctx = {}) {
  switch (phase) {
    case 'offer':
      return buildQuestOfferLines(quest, ctx);
    case 'progress':
      return buildQuestProgressLines(quest, ctx.have ?? 0, ctx);
    case 'ready':
      return buildQuestReadyLines(quest, ctx);
    case 'reward':
      return buildQuestRewardLines(quest, ctx);
    default:
      return buildQuestOfferLines(quest, ctx);
  }
}
