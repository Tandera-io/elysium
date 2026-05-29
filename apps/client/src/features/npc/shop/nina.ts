/**
 * Nina NPC shop inventory — Ferragem da Nina.
 * Nina sells farming tools, fertilizer, and specialty seeds.
 */

export interface ShopItem {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
  category: 'tool' | 'seed' | 'consumable';
}

export const NINA_SHOP_ID = 'nina' as const;

export const NINA_SHOP_ITEMS: ShopItem[] = [
  // Tools
  { item_id: 'watering_can', name: 'Regador', icon: '🪣', price: 150, stock: 5, category: 'tool' },
  { item_id: 'hoe', name: 'Enxada', icon: '⛏️', price: 120, stock: 5, category: 'tool' },
  {
    item_id: 'basket',
    name: 'Cesto de Colheita',
    icon: '🧺',
    price: 60,
    stock: 10,
    category: 'tool',
  },
  // Consumables
  {
    item_id: 'fertilizer',
    name: 'Adubo',
    icon: '🌿',
    price: 40,
    stock: 99,
    category: 'consumable',
  },
  // Specialty seeds
  {
    item_id: 'seed_pumpkin',
    name: 'Sementes de Abóbora',
    icon: '🎃',
    price: 18,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_strawberry',
    name: 'Sementes de Morango',
    icon: '🍓',
    price: 20,
    stock: 99,
    category: 'seed',
  },
];

export const NINA_SHOP = {
  shopId: NINA_SHOP_ID,
  shopName: 'Ferragem da Nina',
  items: NINA_SHOP_ITEMS,
} as const;

export default NINA_SHOP;
