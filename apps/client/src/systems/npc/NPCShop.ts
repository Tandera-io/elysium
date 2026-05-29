import { create } from 'zustand';

export const DORINHA_SHOP_ID = 'dorinha';

interface NPCShopState {
  openShopId: string | null;
}

interface NPCShopActions {
  openShop: (shopId: string) => void;
  closeShop: () => void;
}

export const useNPCShopStore = create<NPCShopState & NPCShopActions>((set) => ({
  openShopId: null,
  openShop: (shopId) => set({ openShopId: shopId }),
  closeShop: () => set({ openShopId: null }),
}));
