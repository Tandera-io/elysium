import { describe, expect, it } from 'vitest';
import { makeSeedMarket } from './seed';
import { getPrice, isCollapsed, tickDay } from './sim';

describe('economy sim', () => {
  it('actors produce only when all consumes are met', () => {
    const seed = makeSeedMarket();
    // Day 0 stocks satisfy Bento's consumes (lenha 5, pao_frances 0)
    // Bento consumes pao_frances 1 but has 0, so should NOT produce trigo
    const day1 = tickDay(seed);
    const bentoAfter = day1.actors.bento;
    expect(bentoAfter).toBeDefined();
    expect(bentoAfter!.stock.trigo ?? 0).toBeLessThanOrEqual(seed.actors.bento!.stock.trigo ?? 0);
    // Shortage logged
    expect(day1.lastDayLog.shortages.some((s) => s.actorId === 'bento')).toBe(true);
  });

  it('price rises when stock dips below desired', () => {
    const seed = makeSeedMarket();
    const marina = seed.actors.marina!;
    const basePrice = getPrice(marina, 'pao_frances');
    // Force scarcity
    const scarce = { ...marina, stock: { ...marina.stock, pao_frances: 0 } };
    const scarcePrice = getPrice(scarce, 'pao_frances');
    expect(scarcePrice).toBeGreaterThan(basePrice);
  });

  it('price drops when stock exceeds desired', () => {
    const seed = makeSeedMarket();
    const marina = seed.actors.marina!;
    const basePrice = getPrice(marina, 'pao_frances');
    const oversupply = { ...marina, stock: { ...marina.stock, pao_frances: 100 } };
    expect(getPrice(oversupply, 'pao_frances')).toBeLessThan(basePrice);
  });

  it('trades occur between actors with shortages and surplus', () => {
    const seed = makeSeedMarket();
    const day1 = tickDay(seed);
    expect(day1.lastDayLog.trades.length).toBeGreaterThan(0);
  });

  it('30-day simulation does not collapse', () => {
    let state = makeSeedMarket();
    for (let d = 0; d < 30; d++) {
      state = tickDay(state);
    }
    const health = isCollapsed(state);
    expect(health.collapsed).toBe(false);
  });

  it('tickDay does not mutate previous state (immutability)', () => {
    const seed = makeSeedMarket();
    const initialMarinaCash = seed.actors.marina!.cash;
    const initialMarinaPao = seed.actors.marina!.stock.pao_frances;
    tickDay(seed);
    expect(seed.actors.marina!.cash).toBe(initialMarinaCash);
    expect(seed.actors.marina!.stock.pao_frances).toBe(initialMarinaPao);
  });

  it('demand multiplier raises price after sustained purchases', () => {
    const seed = makeSeedMarket();
    const marina = seed.actors.marina!;
    const priceBefore = getPrice(marina, 'trigo');
    const heavy: typeof marina = {
      ...marina,
      recentPurchases: { trigo: new Array(7).fill(20) },
    };
    expect(getPrice(heavy, 'trigo')).toBeGreaterThan(priceBefore);
  });
});
