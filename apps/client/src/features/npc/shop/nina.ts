/**
 * Nina NPC shop inventory — Ferragem da Nina.
 * Nina sells farming tools, fertilizer, and specialty seeds.
 */
import { SEED_BUY_PRICE, TOOL_PRICE } from '../../../systems/economy/FarmEconomy';

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
  {
    item_id: 'watering_can',
    name: 'Regador',
    icon: '🪣',
    price: TOOL_PRICE.watering_can,
    stock: 5,
    category: 'tool',
  },
  { item_id: 'hoe', name: 'Enxada', icon: '⛏️', price: TOOL_PRICE.hoe, stock: 5, category: 'tool' },
  {
    item_id: 'basket',
    name: 'Cesto de Colheita',
    icon: '🧺',
    price: TOOL_PRICE.basket,
    stock: 10,
    category: 'tool',
  },
  // Consumables
  {
    item_id: 'fertilizer',
    name: 'Adubo',
    icon: '🌿',
    price: TOOL_PRICE.fertilizer,
    stock: 99,
    category: 'consumable',
  },
  // Specialty seeds (premium crops, higher tier than Dorinha's selection)
  {
    item_id: 'seed_pumpkin',
    name: 'Sementes de Abóbora',
    icon: '🎃',
    price: SEED_BUY_PRICE.seed_pumpkin,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_strawberry',
    name: 'Sementes de Morango',
    icon: '🍓',
    price: SEED_BUY_PRICE.seed_strawberry,
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
