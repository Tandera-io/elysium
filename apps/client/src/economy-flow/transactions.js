/**
 * Economy-flow transaction tracker for NPC interactions and crafting.
 * Records gold movements and item exchanges that occur during gameplay.
 */

const STORAGE_KEY = 'elysium_transactions';
const MAX_HISTORY = 200;

/**
 * @typedef {'buy' | 'sell' | 'quest_reward' | 'gift' | 'craft'} TransactionType
 *
 * @typedef {{ id: string; quantity: number }} ItemEntry
 *
 * @typedef {{
 *   id: string;
 *   type: TransactionType;
 *   npcId: string;
 *   gold: number;
 *   items: ItemEntry[];
 *   timestamp: number;
 * }} Transaction
 */

/** @returns {Transaction[]} */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? /** @type {Transaction[]} */ (JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** @param {Transaction[]} history */
function saveHistory(history) {
  try {
    const trimmed = history.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable — continue silently
  }
}

let _history = loadHistory();

/**
 * Record a new transaction.
 *
 * @param {{
 *   type: TransactionType;
 *   npcId: string;
 *   gold?: number;
 *   items?: ItemEntry[];
 * }} params
 * @returns {Transaction}
 */
export function recordTransaction({ type, npcId, gold = 0, items = [] }) {
  /** @type {Transaction} */
  const tx = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    npcId,
    gold,
    items,
    timestamp: Date.now(),
  };
  _history = [..._history, tx];
  saveHistory(_history);
  return tx;
}

/**
 * Record a purchase from an NPC (player pays gold, receives items).
 *
 * @param {string} npcId
 * @param {number} gold
 * @param {ItemEntry[]} items
 * @returns {Transaction}
 */
export function recordPurchase(npcId, gold, items) {
  return recordTransaction({ type: 'buy', npcId, gold: -Math.abs(gold), items });
}

/**
 * Record a sale to an NPC (player receives gold).
 *
 * @param {string} npcId
 * @param {number} gold
 * @param {ItemEntry[]} items
 * @returns {Transaction}
 */
export function recordSale(npcId, gold, items) {
  return recordTransaction({ type: 'sell', npcId, gold: Math.abs(gold), items });
}

/**
 * Record a quest reward received from an NPC.
 *
 * @param {string} npcId
 * @param {number} gold
 * @param {ItemEntry[]} items
 * @returns {Transaction}
 */
export function recordQuestReward(npcId, gold, items) {
  return recordTransaction({ type: 'quest_reward', npcId, gold: Math.abs(gold), items });
}

/**
 * Record a gift given to an NPC (player spends item for heart gain).
 *
 * @param {string} npcId
 * @param {ItemEntry[]} items
 * @returns {Transaction}
 */
export function recordGift(npcId, items) {
  return recordTransaction({ type: 'gift', npcId, gold: 0, items });
}

/**
 * Record a crafting transaction (player consumes resources to create a tool).
 *
 * @param {string} itemId  The crafted item ID (e.g. 'shovel', 'hoe').
 * @param {{ id: string; qty: number }[]} ingredients  Materials consumed.
 * @param {number} goldCost  Gold spent on the craft.
 * @returns {Transaction}
 */
export function recordCraft(itemId, ingredients, goldCost) {
  return recordTransaction({
    type: 'craft',
    npcId: 'crafting_bench',
    gold: -Math.abs(goldCost),
    items: [
      { id: itemId, quantity: 1 },
      ...ingredients.map((i) => ({ id: i.id, quantity: -i.qty })),
    ],
  });
}

/**
 * Return all recorded transactions, newest first.
 *
 * @returns {Transaction[]}
 */
export function getTransactionHistory() {
  return [..._history].reverse();
}

/**
 * Return net gold balance across all recorded transactions.
 *
 * @returns {number}
 */
export function getNetGold() {
  return _history.reduce((sum, tx) => sum + tx.gold, 0);
}

/**
 * Return transactions for a specific NPC.
 *
 * @param {string} npcId
 * @returns {Transaction[]}
 */
export function getTransactionsByNpc(npcId) {
  return _history.filter((tx) => tx.npcId === npcId);
}

/**
 * Clear transaction history (for testing or new-game scenarios).
 */
export function clearTransactionHistory() {
  _history = [];
  saveHistory(_history);
}
