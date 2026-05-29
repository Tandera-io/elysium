/**
 * Dorinha NPC shop inventory — Quitanda da Dorinha.
 * Dorinha sells seeds and buys harvested crops.
 */

export interface ShopItem {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
  category: 'seed' | 'crop';
}

export const DORINHA_SHOP_ID = 'dorinha' as const;

export const DORINHA_SHOP_ITEMS: ShopItem[] = [
  // Seeds (buy from Dorinha)
  {
    item_id: 'seed_wheat',
    name: 'Sementes de Trigo',
    icon: '🌾',
    price: 10,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_tomato',
    name: 'Sementes de Tomate',
    icon: '🍅',
    price: 15,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_corn',
    name: 'Sementes de Milho',
    icon: '🌽',
    price: 12,
    stock: 99,
    category: 'seed',
  },
  // Crops (sell to Dorinha)
  { item_id: 'wheat', name: 'Trigo', icon: '🌾', price: 50, stock: 0, category: 'crop' },
  { item_id: 'tomato', name: 'Tomate', icon: '🍅', price: 70, stock: 0, category: 'crop' },
  { item_id: 'corn', name: 'Milho', icon: '🌽', price: 60, stock: 0, category: 'crop' },
];

export const DORINHA_SHOP = {
  shopId: DORINHA_SHOP_ID,
  shopName: 'Quitanda da Dorinha',
  items: DORINHA_SHOP_ITEMS,
} as const;

export default DORINHA_SHOP;
