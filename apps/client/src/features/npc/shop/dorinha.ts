import type { ItemId } from '../../../systems/inventory/inventoryStore';

export interface ShopSeedItem {
  id: ItemId;
  name: string;
  icon: string;
  price: number;
}

export interface ShopCropItem {
  id: ItemId;
  name: string;
  icon: string;
  sellPrice: number;
}

export const DORINHA_SEEDS: ShopSeedItem[] = [
  { id: 'seed_wheat', name: 'Sementes de Trigo', icon: '🌾', price: 10 },
  { id: 'seed_tomato', name: 'Sementes de Tomate', icon: '🍅', price: 15 },
  { id: 'seed_corn', name: 'Sementes de Milho', icon: '🌽', price: 12 },
];

export const DORINHA_CROPS: ShopCropItem[] = [
  { id: 'wheat', name: 'Trigo', icon: '🌾', sellPrice: 50 },
  { id: 'tomato', name: 'Tomate', icon: '🍅', sellPrice: 70 },
  { id: 'corn', name: 'Milho', icon: '🌽', sellPrice: 60 },
];
