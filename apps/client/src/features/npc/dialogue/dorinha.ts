/**
 * Dorinha NPC dialogue configuration.
 *
 * The dialogue itself is fully LLM-driven at runtime (POST /api/dialogue).
 * This module provides quick-reply starters and topic hints that DialogueBox
 * renders as buttons so the player does not have to type from scratch.
 *
 * Structure
 * ---------
 * DORINHA_DIALOGUE.greetings          — shown when chat opens (empty history)
 * DORINHA_DIALOGUE.topics.*           — shown after first exchange by context
 * DORINHA_DIALOGUE.shopTriggerPhrases — client-side shop-open detection safety net
 * DORINHA_DIALOGUE.npcId              — canonical NPC identifier ('dorinha')
 *
 * Each quick-reply entry has:
 *   label  — button text rendered in the UI
 *   input  — the playerInput string POSTed to /api/dialogue
 */

export const DORINHA_NPC_ID = 'dorinha' as const;

export interface DorinhaQuickReply {
  label: string;
  input: string;
}

/** Quick-reply suggestions shown when dialogue history is empty. */
export const DORINHA_GREETINGS: DorinhaQuickReply[] = [
  { label: 'Oi, Dorinha!', input: 'Oi, Dorinha! Tudo bem?' },
  { label: 'Quero comprar sementes', input: 'Você tem sementes para vender hoje?' },
  { label: 'Quero vender safra', input: 'Você compra colheita? Tenho trigo, tomate e milho.' },
  { label: 'Como vai o negócio?', input: 'Como está o movimento na quitanda?' },
];

/**
 * Contextual topic suggestions shown after the first exchange.
 * DialogueBox can pick the right subset based on player inventory / gold.
 */
export const DORINHA_TOPICS: Record<string, DorinhaQuickReply[]> = {
  /** Always available — general small talk. */
  general: [
    { label: 'Falar sobre a colheita', input: 'Qual foi a melhor safra que você já viu aqui?' },
    { label: 'Perguntar sobre Marina', input: 'Você e a Marina se conhecem há muito tempo?' },
    { label: 'Concorrência da cidade', input: 'Você tem medo de perder clientes para a cidade?' },
  ],
  /** Shown when player has crops in inventory. */
  selling: [
    { label: 'Vender trigo', input: 'Quanto você paga pelo trigo hoje?' },
    { label: 'Vender tomate', input: 'Preciso vender tomate. Você está comprando?' },
    { label: 'Vender milho', input: 'Você quer milho? Tenho um carregamento.' },
  ],
  /** Shown when player needs seeds / gold is low. */
  seeds: [
    { label: 'Preço das sementes', input: 'Quanto custam as sementes de trigo agora?' },
    { label: 'O que plantar agora?', input: 'O que vale mais a pena plantar nessa época?' },
    { label: 'Tem desconto?', input: 'Você faz um preço especial para um amigo?' },
  ],
};

/**
 * Phrases that, when present in a Dorinha reply, signal the shop should open.
 * The server returns `actionHint: "open_shop"` in these cases; this list is a
 * client-side safety net so DialogueBox can surface the shop button even when
 * the LLM omits the hint.
 */
export const DORINHA_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a quitanda',
  'posso te mostrar o que tenho',
  'dá uma olhada nas sementes',
  'pode escolher o que quer',
  'olha o meu estoque',
];

/**
 * Full dialogue configuration for Dorinha.
 * Import this object wherever you need to drive Dorinha-specific dialogue UI.
 *
 * @example
 * import DORINHA_DIALOGUE from '@/features/npc/dialogue/dorinha';
 * const { greetings, topics, shopTriggerPhrases } = DORINHA_DIALOGUE;
 */
export const DORINHA_DIALOGUE = {
  npcId: DORINHA_NPC_ID,
  greetings: DORINHA_GREETINGS,
  topics: DORINHA_TOPICS,
  shopTriggerPhrases: DORINHA_SHOP_TRIGGER_PHRASES,
} as const;

export default DORINHA_DIALOGUE;
