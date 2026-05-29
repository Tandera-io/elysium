import { create } from 'zustand';
import type { ItemId } from '../inventory/inventoryStore';

export const DORINHA_SHOP_ID = 'dorinha';

export interface ShopEntry {
  id: ItemId;
  label: string;
  /** Price per unit in gold. */
  price: number;
}

/** Items Dorinha buys from the player (crops she accepts). */
export const DORINHA_BUY: ShopEntry[] = [
  { id: 'wheat', label: 'Trigo', price: 10 },
  { id: 'tomato', label: 'Tomate', price: 15 },
  { id: 'corn', label: 'Milho', price: 12 },
];

/** Items Dorinha sells to the player (seeds). */
export const DORINHA_SELL: ShopEntry[] = [
  { id: 'seed_wheat', label: 'Semente de Trigo', price: 20 },
  { id: 'seed_tomato', label: 'Semente de Tomate', price: 30 },
  { id: 'seed_corn', label: 'Semente de Milho', price: 25 },
];

export interface NPCShopState {
  openShopId: string | null;
}

export interface NPCShopActions {
  openShop: (shopId: string) => void;
  closeShop: () => void;
}

export const useNPCShopStore = create<NPCShopState & NPCShopActions>((set) => ({
  openShopId: null,
  openShop: (shopId) => set({ openShopId: shopId }),
  closeShop: () => set({ openShopId: null }),
}));
