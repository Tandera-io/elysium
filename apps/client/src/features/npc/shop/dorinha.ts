import type { ItemId } from '../../../systems/inventory/inventoryStore';

export interface SeedItem {
  id: Extract<ItemId, 'seed_wheat' | 'seed_tomato' | 'seed_corn'>;
  name: string;
  icon: string;
  price: number;
}

export interface CropItem {
  id: Extract<ItemId, 'wheat' | 'tomato' | 'corn'>;
  name: string;
  icon: string;
  sellPrice: number;
}

export const DORINHA_SEEDS: SeedItem[] = [
  { id: 'seed_wheat', name: 'Sementes de Trigo', icon: '🌾', price: 10 },
  { id: 'seed_tomato', name: 'Sementes de Tomate', icon: '🍅', price: 15 },
  { id: 'seed_corn', name: 'Sementes de Milho', icon: '🌽', price: 12 },
];

export const DORINHA_CROPS: CropItem[] = [
  { id: 'wheat', name: 'Trigo', icon: '🌾', sellPrice: 50 },
  { id: 'tomato', name: 'Tomate', icon: '🍅', sellPrice: 70 },
  { id: 'corn', name: 'Milho', icon: '🌽', sellPrice: 60 },
];
