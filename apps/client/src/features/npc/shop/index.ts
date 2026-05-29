/**
 * Shop registry — maps a shopkeeper NPC id to its rich shop definition
 * (named items with icons, prices, stock, and category). Consumed by
 * NPCShopModal to render the inventory the player can buy from / sell to.
 */
import { DORINHA_SHOP } from './dorinha';

export interface ShopItemView {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
  /** 'seed' | 'crop' | 'tool' | 'consumable' across all shops. */
  category: string;
}

export interface ShopView {
  shopId: string;
  shopName: string;
  items: readonly ShopItemView[];
}

export const SHOPS: Record<string, ShopView> = {
  [DORINHA_SHOP.shopId]: DORINHA_SHOP,
};

export function getShop(shopId: string | null | undefined): ShopView | null {
  if (!shopId) return null;
  return SHOPS[shopId] ?? null;
}
