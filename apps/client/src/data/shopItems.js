/** Shop catalog keyed by NPC/shop ID. */
export const SHOP_CATALOG = {
  dorinha: {
    buy: [
      { id: 'seed_wheat', name: 'Sementes de Trigo', icon: '🌾', price: 10 },
      { id: 'seed_tomato', name: 'Sementes de Tomate', icon: '🍅', price: 15 },
      { id: 'seed_corn', name: 'Sementes de Milho', icon: '🌽', price: 12 },
    ],
    sell: [
      { id: 'wheat', name: 'Trigo', icon: '🌾', sellPrice: 50 },
      { id: 'tomato', name: 'Tomate', icon: '🍅', sellPrice: 70 },
      { id: 'corn', name: 'Milho', icon: '🌽', sellPrice: 60 },
      { id: 'pumpkin', name: 'Abóbora', icon: '🎃', sellPrice: 80 },
      { id: 'strawberry', name: 'Morango', icon: '🍓', sellPrice: 40 },
    ],
  },
};
