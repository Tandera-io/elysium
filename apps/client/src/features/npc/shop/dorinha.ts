/**
 * Dorinha NPC shop inventory — Quitanda da Dorinha.
 * Dorinha sells seeds and buys harvested crops.
 */
import { CROP_SELL_PRICE, SEED_BUY_PRICE } from '../../../systems/economy/FarmEconomy';

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
    price: SEED_BUY_PRICE.seed_wheat,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_tomato',
    name: 'Sementes de Tomate',
    icon: '🍅',
    price: SEED_BUY_PRICE.seed_tomato,
    stock: 99,
    category: 'seed',
  },
  {
    item_id: 'seed_corn',
    name: 'Sementes de Milho',
    icon: '🌽',
    price: SEED_BUY_PRICE.seed_corn,
    stock: 99,
    category: 'seed',
  },
  // Crops (sell to Dorinha)
  {
    item_id: 'wheat',
    name: 'Trigo',
    icon: '🌾',
    price: CROP_SELL_PRICE.wheat,
    stock: 0,
    category: 'crop',
  },
  {
    item_id: 'tomato',
    name: 'Tomate',
    icon: '🍅',
    price: CROP_SELL_PRICE.tomato,
    stock: 0,
    category: 'crop',
  },
  {
    item_id: 'corn',
    name: 'Milho',
    icon: '🌽',
    price: CROP_SELL_PRICE.corn,
    stock: 0,
    category: 'crop',
  },
];

export const DORINHA_SHOP = {
  shopId: DORINHA_SHOP_ID,
  shopName: 'Quitanda da Dorinha',
  items: DORINHA_SHOP_ITEMS,
} as const;

export default DORINHA_SHOP;
