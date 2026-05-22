import { ITEMS, type EconomyItemId } from './itemDefs';

/**
 * Pure-functional economy simulation. No React, no Zustand, no fs — safe to
 * import from Node CLIs (scripts/audit-economy.ts) and from the browser.
 *
 * Model
 * -----
 * An Actor is an NPC (or the player) with:
 *   - stock: items currently held
 *   - desiredStock: target inventory level the actor wants to keep
 *   - dailyConsumes: items consumed every tick
 *   - dailyProduces: items produced every tick IFF the consumes are met
 *   - cash: money on hand
 *
 * Each daily tick:
 *   1. Each actor consumes its dailyConsumes from its stock if available;
 *      missing inputs queue a purchase order at the village market
 *   2. Each producer produces its dailyProduces if all consumes were met
 *   3. Recent purchases drive a demand multiplier for next-day pricing
 *   4. Buyers and sellers match at the market; trades transfer cash + stock
 *
 * Prices are computed per-(actor, item) from desired_stock vs current_stock,
 * scaled by a recent-purchase demand multiplier. Cache hits aren't real but
 * the formula matches the master prompt §7.1.
 */

export interface Actor {
  id: string;
  name: string;
  cash: number;
  stock: Partial<Record<EconomyItemId, number>>;
  desiredStock: Partial<Record<EconomyItemId, number>>;
  dailyConsumes: Partial<Record<EconomyItemId, number>>;
  dailyProduces: Partial<Record<EconomyItemId, number>>;
  /** Track last N days of purchases of each item to drive demand multiplier. */
  recentPurchases: Partial<Record<EconomyItemId, number[]>>;
  /** Set to true if the actor produces; false otherwise. */
  isProducer: boolean;
}

export interface MarketState {
  day: number;
  actors: Record<string, Actor>;
  /** Last cleared transaction log (for inspection/auditing). */
  lastDayLog: TransactionLog;
}

export interface TransactionLog {
  trades: Trade[];
  shortages: Shortage[];
  /** Aggregate price per item across the market on this day. */
  averagePrice: Partial<Record<EconomyItemId, number>>;
}

export interface Trade {
  item: EconomyItemId;
  quantity: number;
  unitPrice: number;
  fromActorId: string;
  toActorId: string;
}

export interface Shortage {
  actorId: string;
  item: EconomyItemId;
  amount: number;
}

export const DEMAND_WINDOW_DAYS = 7;
export const PRICE_DEMAND_FLOOR = 0.5;
export const PRICE_DEMAND_CEILING = 2.0;
export const BASELINE_PURCHASES = 2; // expected per-day baseline for normalization

export function getPrice(actor: Actor, item: EconomyItemId): number {
  const def = ITEMS[item];
  const cur = actor.stock[item] ?? 0;
  const desired = actor.desiredStock[item];
  if (!desired || desired <= 0) return def.basePrice;
  const stockFactor = 1 + (desired - cur) / desired; // < 1 if oversupplied, > 1 if undersupplied
  const recent = actor.recentPurchases[item] ?? [];
  const recentTotal = recent.reduce((acc, v) => acc + v, 0);
  const demand = clamp(
    PRICE_DEMAND_FLOOR,
    PRICE_DEMAND_CEILING,
    1 + recentTotal / Math.max(1, BASELINE_PURCHASES * DEMAND_WINDOW_DAYS),
  );
  return Math.max(0.1, def.basePrice * stockFactor * demand);
}

function clamp(lo: number, hi: number, x: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function get<K extends string, V extends number>(rec: Partial<Record<K, V>>, k: K): V {
  return (rec[k] ?? 0) as V;
}

function bump<K extends string>(rec: Partial<Record<K, number>>, k: K, delta: number): void {
  rec[k] = (rec[k] ?? 0) + delta;
}

/**
 * Step the market by exactly one in-game day. Returns a fresh MarketState
 * (does not mutate input). The transaction log is attached for inspection.
 */
export function tickDay(prev: MarketState): MarketState {
  const next: MarketState = {
    day: prev.day + 1,
    actors: {},
    lastDayLog: { trades: [], shortages: [], averagePrice: {} },
  };

  // Clone actors and rotate purchase windows
  for (const [id, a] of Object.entries(prev.actors)) {
    next.actors[id] = {
      ...a,
      stock: { ...a.stock },
      recentPurchases: rotatePurchases(a.recentPurchases),
    };
  }

  const shortages: Shortage[] = [];

  // 1. Consume
  for (const a of Object.values(next.actors)) {
    let allMet = true;
    for (const [item, qty] of Object.entries(a.dailyConsumes) as [EconomyItemId, number][]) {
      const have = get(a.stock, item);
      if (have >= qty) {
        bump(a.stock, item, -qty);
      } else {
        allMet = false;
        bump(a.stock, item, -have);
        shortages.push({ actorId: a.id, item, amount: qty - have });
      }
    }
    // Stash a hint on the actor for the production step
    (a as Actor & { _allConsumesMet?: boolean })._allConsumesMet = allMet;
  }

  // 2. Produce if all consumes were met
  for (const a of Object.values(next.actors)) {
    const meta = a as Actor & { _allConsumesMet?: boolean };
    if (a.isProducer && meta._allConsumesMet !== false) {
      for (const [item, qty] of Object.entries(a.dailyProduces) as [EconomyItemId, number][]) {
        bump(a.stock, item, qty);
      }
    }
    delete meta._allConsumesMet;
  }

  // 3. Match buyers/sellers. Greedy: each shortage finds the cheapest seller
  //    that has stock and the buyer has cash for.
  const trades: Trade[] = [];
  for (const shortage of shortages) {
    let remaining = shortage.amount;
    const buyer = next.actors[shortage.actorId];
    if (!buyer) continue;
    const sellers = Object.values(next.actors)
      .filter((s) => s.id !== buyer.id && (s.stock[shortage.item] ?? 0) > 0)
      .map((s) => ({ s, price: getPrice(s, shortage.item) }))
      .sort((a, b) => a.price - b.price);

    for (const { s, price } of sellers) {
      if (remaining <= 0) break;
      const available = s.stock[shortage.item] ?? 0;
      const affordable = price > 0 ? Math.floor(buyer.cash / price) : remaining;
      const take = Math.max(0, Math.min(remaining, available, affordable));
      if (take <= 0) continue;
      bump(s.stock, shortage.item, -take);
      bump(buyer.stock, shortage.item, take);
      const total = take * price;
      buyer.cash -= total;
      s.cash += total;
      remaining -= take;
      // Track today's purchase: last element of the rolling window is "today"
      const window =
        buyer.recentPurchases[shortage.item] ?? new Array<number>(DEMAND_WINDOW_DAYS).fill(0);
      window[window.length - 1] = (window[window.length - 1] ?? 0) + take;
      buyer.recentPurchases[shortage.item] = window;
      trades.push({
        item: shortage.item,
        quantity: take,
        unitPrice: price,
        fromActorId: s.id,
        toActorId: buyer.id,
      });
    }
  }

  // 4. Average prices for log
  const avgPrice: Partial<Record<EconomyItemId, number>> = {};
  const counts: Partial<Record<EconomyItemId, number>> = {};
  for (const a of Object.values(next.actors)) {
    for (const item of Object.keys(ITEMS) as EconomyItemId[]) {
      if ((a.stock[item] ?? 0) > 0 || (a.dailyProduces[item] ?? 0) > 0) {
        const p = getPrice(a, item);
        avgPrice[item] = (avgPrice[item] ?? 0) + p;
        counts[item] = (counts[item] ?? 0) + 1;
      }
    }
  }
  for (const item of Object.keys(avgPrice) as EconomyItemId[]) {
    const c = counts[item] ?? 1;
    avgPrice[item] = (avgPrice[item] ?? 0) / c;
  }

  next.lastDayLog = { trades, shortages, averagePrice: avgPrice };
  return next;
}

function rotatePurchases(
  src: Partial<Record<EconomyItemId, number[]>>,
): Partial<Record<EconomyItemId, number[]>> {
  const out: Partial<Record<EconomyItemId, number[]>> = {};
  for (const [item, window] of Object.entries(src) as [EconomyItemId, number[]][]) {
    const next = window.slice(1);
    next.push(0);
    out[item] = next;
  }
  return out;
}

/** Quick health check: any actor in the red (negative cash) or starving? */
export function isCollapsed(state: MarketState): { collapsed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const a of Object.values(state.actors)) {
    if (a.cash < -50) reasons.push(`${a.id} cash ${a.cash.toFixed(0)}`);
    // Starvation: consumes more than 1 day with no stock for any required item
    for (const [item, qty] of Object.entries(a.dailyConsumes) as [EconomyItemId, number][]) {
      if (qty > 0 && (a.stock[item] ?? 0) === 0) {
        const shortages = state.lastDayLog.shortages.filter(
          (s) => s.actorId === a.id && s.item === item,
        );
        if (shortages.length > 0 && a.cash < ITEMS[item].basePrice) {
          reasons.push(`${a.id} cannot buy ${item}`);
        }
      }
    }
  }
  return { collapsed: reasons.length > 0, reasons };
}
