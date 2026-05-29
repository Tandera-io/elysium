import { create } from 'zustand';

export const DORINHA_SHOP_ID = 'dorinha';

export interface NPCShopState {
  openShopId: string | null;
}

export interface NPCShopActions {
  openShop: (id: string) => void;
  closeShop: () => void;
}

export const useNPCShopStore = create<NPCShopState & NPCShopActions>((set) => ({
  openShopId: null,
  openShop: (id) => set({ openShopId: id }),
  closeShop: () => set({ openShopId: null }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcShop: typeof useNPCShopStore }).__npcShop = useNPCShopStore;
}
