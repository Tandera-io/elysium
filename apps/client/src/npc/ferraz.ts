/**
 * Ferraz NPC shop — Ferraria do Ferraz.
 * Ferraz sells tools and upgrades, and buys raw materials from the player.
 * buyPrice: gold the player spends to purchase from Ferraz.
 * sellPrice: gold the player receives when selling to Ferraz.
 */

export interface FerrazShopItem {
  item_id: string;
  name: string;
  icon: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  category: 'tool' | 'material' | 'upgrade';
}

export const FERRAZ_SHOP_ID = 'ferraz' as const;

export const FERRAZ_SHOP_ITEMS: FerrazShopItem[] = [
  {
    item_id: 'pickaxe',
    name: 'Picareta',
    icon: '⛏️',
    buyPrice: 180,
    sellPrice: 90,
    stock: 3,
    category: 'tool',
  },
  {
    item_id: 'axe',
    name: 'Machado',
    icon: '🪓',
    buyPrice: 160,
    sellPrice: 80,
    stock: 3,
    category: 'tool',
  },
  {
    item_id: 'shovel',
    name: 'Pá',
    icon: '🪚',
    buyPrice: 140,
    sellPrice: 70,
    stock: 5,
    category: 'tool',
  },
  {
    item_id: 'iron_hoe',
    name: 'Enxada de Ferro',
    icon: '🔨',
    buyPrice: 300,
    sellPrice: 150,
    stock: 2,
    category: 'upgrade',
  },
  {
    item_id: 'iron_ore',
    name: 'Minério de Ferro',
    icon: '🪨',
    buyPrice: 30,
    sellPrice: 20,
    stock: 99,
    category: 'material',
  },
  {
    item_id: 'lenha',
    name: 'Lenha',
    icon: '🪵',
    buyPrice: 10,
    sellPrice: 5,
    stock: 99,
    category: 'material',
  },
  {
    item_id: 'coal',
    name: 'Carvão',
    icon: '⚫',
    buyPrice: 15,
    sellPrice: 8,
    stock: 99,
    category: 'material',
  },
];

export const FERRAZ_SHOP = {
  shopId: FERRAZ_SHOP_ID,
  shopName: 'Ferraria do Ferraz',
  items: FERRAZ_SHOP_ITEMS,
} as const;

export default FERRAZ_SHOP;
