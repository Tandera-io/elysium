/**
 * Ferraz NPC shop inventory — Ferraria do Ferraz.
 * Ferraz sells upgraded tools, raw materials, and weapon-grade gear.
 * He also buys raw ore from the player (sellPrice > 0).
 */

import type { ShopItem } from './nina';

export { type ShopItem };

export const FERRAZ_SHOP_ID = 'ferraz' as const;

export const FERRAZ_SHOP_ITEMS: ShopItem[] = [
  // Upgraded tools — exclusive to Ferraz
  {
    item_id: 'enxada_reforçada',
    name: 'Enxada Reforçada',
    icon: '⛏️',
    price: 240,
    stock: 3,
    category: 'tool',
  },
  {
    item_id: 'regador_reforçado',
    name: 'Regador Reforçado',
    icon: '🪣',
    price: 280,
    stock: 3,
    category: 'tool',
  },
  {
    item_id: 'picareta',
    name: 'Picareta',
    icon: '⛏️',
    price: 300,
    stock: 5,
    category: 'tool',
  },
  {
    item_id: 'foice',
    name: 'Foice',
    icon: '🌾',
    price: 180,
    stock: 5,
    category: 'tool',
  },
  // Raw materials — player can buy or sell these
  {
    item_id: 'ferro_bruto',
    name: 'Ferro Bruto',
    icon: '🪨',
    price: 30,
    stock: 99,
    category: 'consumable',
  },
  {
    item_id: 'carvao',
    name: 'Carvão',
    icon: '🪵',
    price: 15,
    stock: 99,
    category: 'consumable',
  },
  {
    item_id: 'lenha',
    name: 'Lenha',
    icon: '🪵',
    price: 10,
    stock: 99,
    category: 'consumable',
  },
  // Specialty items
  {
    item_id: 'amolador',
    name: 'Pedra de Afiar',
    icon: '🔩',
    price: 50,
    stock: 20,
    category: 'consumable',
  },
];

/**
 * Items Ferraz is willing to **buy** from the player (sell prices from player's perspective).
 * Key is item_id, value is gold paid per unit.
 */
export const FERRAZ_BUY_PRICES: Record<string, number> = {
  ferro_bruto: 20,
  carvao: 8,
  lenha: 6,
  minério_especial: 80,
};

export const FERRAZ_SHOP = {
  shopId: FERRAZ_SHOP_ID,
  shopName: 'Ferraria do Ferraz',
  items: FERRAZ_SHOP_ITEMS,
  buyPrices: FERRAZ_BUY_PRICES,
} as const;

export default FERRAZ_SHOP;
