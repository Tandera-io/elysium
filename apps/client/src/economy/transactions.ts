/**
 * Economy transaction functions for player buy/sell interactions.
 * Maintains an in-memory player account (money + inventory) and a
 * log of all completed trades for audit and UI feedback.
 */

export interface TransactionRecord {
  type: 'buy' | 'sell';
  playerId: string;
  itemId: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface PlayerAccount {
  playerId: string;
  money: number;
  inventory: Record<string, number>;
}

const _accounts = new Map<string, PlayerAccount>();

export const transactionHistory: TransactionRecord[] = [];

function getOrCreate(playerId: string): PlayerAccount {
  if (!_accounts.has(playerId)) {
    _accounts.set(playerId, { playerId, money: 100, inventory: {} });
  }
  return _accounts.get(playerId)!;
}

export function getAccount(playerId: string): PlayerAccount {
  return getOrCreate(playerId);
}

export function buyItem(
  playerId: string,
  itemId: string,
  quantity: number,
  pricePerUnit: number,
): { success: boolean; reason?: string } {
  const account = getOrCreate(playerId);
  const total = pricePerUnit * quantity;
  if (account.money < total) {
    return { success: false, reason: 'Ouro insuficiente' };
  }
  account.money -= total;
  account.inventory[itemId] = (account.inventory[itemId] ?? 0) + quantity;
  transactionHistory.push({ type: 'buy', playerId, itemId, quantity, pricePerUnit, total });
  return { success: true };
}

export function sellItem(
  playerId: string,
  itemId: string,
  quantity: number,
  pricePerUnit: number,
): { success: boolean; reason?: string } {
  const account = getOrCreate(playerId);
  const held = account.inventory[itemId] ?? 0;
  if (held < quantity) {
    return { success: false, reason: 'Itens insuficientes no inventário' };
  }
  const total = pricePerUnit * quantity;
  account.money += total;
  account.inventory[itemId] = held - quantity;
  transactionHistory.push({ type: 'sell', playerId, itemId, quantity, pricePerUnit, total });
  return { success: true };
}
