#!/usr/bin/env tsx
/**
 * Run a headless economy simulation for N days and print a summary.
 * Fails the process (exit 1) if the economy collapses at any point —
 * suitable for use in CI to guard against balance regressions.
 *
 *   pnpm audit:economy           # default 30 days
 *   pnpm audit:economy --days 60
 */
import { makeSeedMarket } from '../apps/client/src/systems/economy/seed';
import { isCollapsed, tickDay, type MarketState } from '../apps/client/src/systems/economy/sim';
import type { EconomyItemId } from '../apps/client/src/systems/economy/itemDefs';

const args = process.argv.slice(2);
function arg(name: string, def: number): number {
  const idx = args.indexOf(`--${name}`);
  const v = idx >= 0 ? args[idx + 1] : undefined;
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : def;
}

const DAYS = arg('days', 30);

let state = makeSeedMarket();
let collapseDay: number | null = null;
const priceHistory: Partial<Record<EconomyItemId, number[]>> = {};

for (let d = 0; d < DAYS; d++) {
  state = tickDay(state);
  for (const [item, avg] of Object.entries(state.lastDayLog.averagePrice) as [
    EconomyItemId,
    number,
  ][]) {
    (priceHistory[item] ??= []).push(avg);
  }
  const health = isCollapsed(state);
  if (health.collapsed && collapseDay === null) {
    collapseDay = state.day;
    console.error(`[audit:economy] collapsed on day ${collapseDay}:`);
    for (const r of health.reasons) console.error(`  • ${r}`);
  }
}

console.info(`[audit:economy] Simulated ${DAYS} days.\n`);
console.info('Final actor balances:');
for (const a of Object.values(state.actors)) {
  console.info(
    `  ${a.id.padEnd(10)} cash=${a.cash.toFixed(0).padStart(6)}  stock=${Object.entries(a.stock)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')}`,
  );
}

console.info('\nPrice trajectory (start → end):');
for (const [item, hist] of Object.entries(priceHistory) as [EconomyItemId, number[]][]) {
  const first = hist[0]?.toFixed(1) ?? '?';
  const last = hist[hist.length - 1]?.toFixed(1) ?? '?';
  const min = Math.min(...hist).toFixed(1);
  const max = Math.max(...hist).toFixed(1);
  console.info(`  ${item.padEnd(12)} ${first} → ${last}  (min ${min}, max ${max})`);
}

console.info(`\nTotal trades: ${countAllTrades(state)}`);
console.info(`Final-day shortages: ${state.lastDayLog.shortages.length}`);

if (collapseDay !== null) {
  console.error(`\n❌ Economy collapsed on day ${collapseDay} of ${DAYS}.`);
  process.exit(1);
}

console.info('\n✓ Economy stable across the full window.');

function countAllTrades(s: MarketState): number {
  return s.lastDayLog.trades.length;
}
