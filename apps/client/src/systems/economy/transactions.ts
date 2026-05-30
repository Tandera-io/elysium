/**
 * Player-facing buy/sell transaction layer.
 *
 * Bridges the player's Zustand inventory store with the vendor NPC shop
 * inventories. All functions are pure operations that delegate persistence
 * to the inventory store; the transaction log is kept in module-level memory
 * and reset on page reload (no persistence needed for the ledger itself).
 *
 * Usage:
 *   const result = buyItem('player', 'pico_ferro', 1, { price: 80 });
 *   const result = sellItem('player', 'trigo', 3, { price: 10 });
 */

import { useInventoryStore } from '../inventory/inventoryStore';
import type { ItemId } from '../inventory/inventoryStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionType = 'buy' | 'sell';

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  playerId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  /** Unix timestamp (ms) when the transaction occurred. */
  timestamp: number;
  npcId?: string;
}

export type TransactionResult =
  | { ok: true; record: TransactionRecord }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// In-memory ledger (per-session)
// ---------------------------------------------------------------------------

export const transactionHistory: TransactionRecord[] = [];

let _seq = 0;
function nextId(): string {
  return `txn-${Date.now()}-${++_seq}`;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current gold balance for the player from the inventory store.
 * Exposed for convenience/testing.
 */
export function getPlayerGold(_playerId: string): number {
  return useInventoryStore.getState().gold;
}

/**
 * Returns how many of `itemId` the player currently holds.
 */
export function getPlayerItemCount(_playerId: string, itemId: string): number {
  const store = useInventoryStore.getState();
  // count() only accepts a known ItemId; cast after validation
  return store.count(itemId as ItemId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Buy `quantity` units of `itemId` from a vendor at `price` gold each.
 *
 * Validates gold sufficiency and inventory space, then commits via Zustand.
 *
 * @param playerId   Identifier for the player (reserved for multi-player; use 'player').
 * @param itemId     The item being purchased.
 * @param quantity   Number of units to buy (must be >= 1).
 * @param opts       `price` (gold per unit) and optional `npcId` for the ledger.
 */
export function buyItem(
  playerId: string,
  itemId: string,
  quantity: number,
  opts: { price: number; npcId?: string },
): TransactionResult {
  if (quantity < 1) {
    return { ok: false, reason: 'Quantity must be at least 1.' };
  }

  const totalCost = opts.price * quantity;
  const store = useInventoryStore.getState();

  if (store.gold < totalCost) {
    return {
      ok: false,
      reason: `Insufficient gold: need ${totalCost}, have ${store.gold}.`,
    };
  }

  // Deduct gold first
  const goldOk = store.removeGold(totalCost);
  if (!goldOk) {
    return { ok: false, reason: 'Gold deduction failed (race condition).' };
  }

  // Add item to inventory
  const addOk = store.add(itemId as ItemId, quantity);
  if (!addOk) {
    // Inventory full — refund gold
    store.addGold(totalCost);
    return { ok: false, reason: 'Inventory full — cannot add item.' };
  }

  const record: TransactionRecord = {
    id: nextId(),
    type: 'buy',
    playerId,
    itemId,
    quantity,
    unitPrice: opts.price,
    totalCost,
    timestamp: Date.now(),
    npcId: opts.npcId,
  };
  transactionHistory.push(record);
  return { ok: true, record };
}

/**
 * Sell `quantity` units of `itemId` to a vendor at `price` gold each.
 *
 * Validates that the player holds enough of the item, then commits via Zustand.
 *
 * @param playerId   Identifier for the player.
 * @param itemId     The item being sold.
 * @param quantity   Number of units to sell (must be >= 1).
 * @param opts       `price` (gold per unit) and optional `npcId` for the ledger.
 */
export function sellItem(
  playerId: string,
  itemId: string,
  quantity: number,
  opts: { price: number; npcId?: string },
): TransactionResult {
  if (quantity < 1) {
    return { ok: false, reason: 'Quantity must be at least 1.' };
  }

  const store = useInventoryStore.getState();
  const held = store.count(itemId as ItemId);

  if (held < quantity) {
    return {
      ok: false,
      reason: `Not enough ${itemId}: need ${quantity}, have ${held}.`,
    };
  }

  const removeOk = store.remove(itemId as ItemId, quantity);
  if (!removeOk) {
    return { ok: false, reason: 'Item removal failed (race condition).' };
  }

  const totalCost = opts.price * quantity;
  store.addGold(totalCost);

  const record: TransactionRecord = {
    id: nextId(),
    type: 'sell',
    playerId,
    itemId,
    quantity,
    unitPrice: opts.price,
    totalCost,
    timestamp: Date.now(),
    npcId: opts.npcId,
  };
  transactionHistory.push(record);
  return { ok: true, record };
}

/**
 * Returns a filtered view of `transactionHistory` for the given player,
 * optionally filtered to a specific NPC.
 */
export function getTransactionHistory(
  playerId: string,
  opts: { npcId?: string } = {},
): TransactionRecord[] {
  return transactionHistory.filter(
    (r) => r.playerId === playerId && (opts.npcId === undefined || r.npcId === opts.npcId),
  );
}
