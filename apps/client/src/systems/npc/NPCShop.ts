/**
 * NPC Shop store — tracks which shop is open.
 * Dorinha (quitanda) and Nina (ferragem) are the village shopkeepers.
 */
import { create } from 'zustand';

export const DORINHA_SHOP_ID = 'dorinha';
export const NINA_SHOP_ID = 'nina';

export interface NPCShopState {
  openShopId: string | null;
}

export interface NPCShopActions {
  openShop: (npcId: string) => void;
  closeShop: () => void;
}

export const useNPCShopStore = create<NPCShopState & NPCShopActions>((set) => ({
  openShopId: null,
  openShop: (npcId) => set({ openShopId: npcId }),
  closeShop: () => set({ openShopId: null }),
}));
