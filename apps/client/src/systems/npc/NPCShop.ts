import { create } from 'zustand';
import { useInventoryStore, type ItemId } from '../inventory/inventoryStore';

export const DORINHA_SHOP_ID = 'dorinha';

export interface ShopListing {
  itemId: ItemId;
  name: string;
  price: number;
}

export const DORINHA_BUY_LISTINGS: ShopListing[] = [
  { itemId: 'seed_wheat', name: 'Semente de trigo', price: 15 },
  { itemId: 'seed_tomato', name: 'Semente de tomate', price: 20 },
  { itemId: 'seed_corn', name: 'Semente de milho', price: 18 },
  { itemId: 'flour', name: 'Farinha', price: 12 },
];

export const DORINHA_SELL_PRICES: Partial<Record<ItemId, number>> = {
  wheat: 8,
  tomato: 10,
  corn: 9,
};

export interface NPCShopState {
  openShopId: string | null;
}

export interface NPCShopActions {
  openShop: (id: string) => void;
  closeShop: () => void;
  buyItem: (itemId: ItemId, price: number) => boolean;
  sellItem: (itemId: ItemId, qty: number, priceEach: number) => boolean;
}

export const useNPCShopStore = create<NPCShopState & NPCShopActions>((set) => ({
  openShopId: null,

  openShop: (id) => set({ openShopId: id }),
  closeShop: () => set({ openShopId: null }),

  buyItem: (itemId, price) => {
    const inv = useInventoryStore.getState();
    if (!inv.removeGold(price)) return false;
    inv.add(itemId, 1);
    return true;
  },

  sellItem: (itemId, qty, priceEach) => {
    const inv = useInventoryStore.getState();
    if (!inv.remove(itemId, qty)) return false;
    inv.addGold(priceEach * qty);
    return true;
  },
}));
