/**
 * NPC Shop store — tracks which shop is open.
 * Dorinha is the primary shopkeeper in the village market.
 */
import { create } from 'zustand';
import { DORINHA_ID } from '../../npc/Dorinha';

export const DORINHA_SHOP_ID: string = DORINHA_ID;

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
