import type { Actor, MarketState } from './sim';

/**
 * Default seeded market with Marina (padeira), Bento (fazendeiro), Lucia
 * (vaqueira), and Padre Pedro (pároco). These actors close basic loops:
 * Bento produces wheat consumed by Marina; Lucia produces milk consumed by
 * Marina; Marina produces bread consumed by Bento and Lucia; Padre Pedro
 * needs trigo for communion bread and accepts donations. Player isn't
 * modelled here — Phase 11 adds the player as a real economic participant.
 */

const marina: Actor = {
  id: 'marina',
  name: 'Marina',
  cash: 200,
  stock: { trigo: 4, leite: 2, ovo: 5, lenha: 8, pao_frances: 6 },
  desiredStock: { trigo: 10, leite: 6, ovo: 8, lenha: 12, pao_frances: 10 },
  dailyConsumes: { trigo: 3, leite: 1, ovo: 1, lenha: 2 },
  dailyProduces: { pao_frances: 6, bolo_fuba: 2 },
  recentPurchases: {},
  isProducer: true,
};

const bento: Actor = {
  id: 'bento',
  name: 'Tio Bento',
  cash: 200,
  stock: { trigo: 12, lenha: 5, pao_frances: 0 },
  desiredStock: { trigo: 8, lenha: 8, pao_frances: 4 },
  dailyConsumes: { lenha: 1, pao_frances: 1 },
  dailyProduces: { trigo: 5, lenha: 2 },
  recentPurchases: {},
  isProducer: true,
};

const lucia: Actor = {
  id: 'lucia',
  name: 'Tia Lúcia',
  cash: 200,
  stock: { leite: 6, ovo: 8, pao_frances: 0 },
  desiredStock: { leite: 4, ovo: 6, pao_frances: 3 },
  dailyConsumes: { pao_frances: 1 },
  dailyProduces: { leite: 4, ovo: 3 },
  recentPurchases: {},
  isProducer: true,
};

// Padre Pedro receives community donations (modelled as high starting cash).
// He consumes trigo for communion bread and offers quests when stock is low.
const padrePedro: Actor = {
  id: 'padre_pedro',
  name: 'Padre Pedro',
  cash: 800,
  stock: { trigo: 2 },
  desiredStock: { trigo: 8 },
  dailyConsumes: { trigo: 1 },
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

export function makeSeedMarket(): MarketState {
  return {
    day: 0,
    actors: { marina, bento, lucia, padre_pedro: padrePedro },
    lastDayLog: { trades: [], shortages: [], averagePrice: {} },
  };
}
