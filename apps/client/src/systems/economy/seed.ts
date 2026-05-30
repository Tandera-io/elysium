import type { Actor, MarketState } from './sim';

/**
 * Default seeded market with all village NPCs. Marina, Bento and Lucia
 * form the original production loop. Hub NPCs (dorinha, nina, padre_pedro,
 * arnaldo, sofia, romeu) each have deliberate deficits so that proposeQuestFor
 * will generate a quest for them when the player talks to them.
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

// Hub NPCs — each has a deficit large enough to always generate a quest
// (desired − stock ≥ 3). No dailyProduces; they are quest-givers, not
// producers in the economic simulation.

const dorinha: Actor = {
  id: 'dorinha',
  name: 'Dorinha',
  cash: 150,
  stock: { trigo: 2, tomate: 1 },
  desiredStock: { trigo: 8, tomate: 6 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

const nina: Actor = {
  id: 'nina',
  name: 'Nina',
  cash: 150,
  stock: { lenha: 1 },
  desiredStock: { lenha: 6 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

const padre_pedro: Actor = {
  id: 'padre_pedro',
  name: 'Padre Pedro',
  cash: 100,
  stock: { pao_frances: 0, mel: 0 },
  desiredStock: { pao_frances: 5, mel: 4 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

const arnaldo: Actor = {
  id: 'arnaldo',
  name: 'Arnaldo',
  cash: 180,
  stock: { madeira: 2 },
  desiredStock: { madeira: 10 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

const sofia: Actor = {
  id: 'sofia',
  name: 'Sofia',
  cash: 140,
  stock: { erva_medicinal: 1, mel: 1 },
  desiredStock: { erva_medicinal: 6, mel: 5 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

const romeu: Actor = {
  id: 'romeu',
  name: 'Romeu',
  cash: 120,
  stock: { peixe: 2 },
  desiredStock: { peixe: 8 },
  dailyConsumes: {},
  dailyProduces: {},
  recentPurchases: {},
  isProducer: false,
};

export function makeSeedMarket(): MarketState {
  return {
    day: 0,
    actors: { marina, bento, lucia, dorinha, nina, padre_pedro, arnaldo, sofia, romeu },
    lastDayLog: { trades: [], shortages: [], averagePrice: {} },
  };
}
