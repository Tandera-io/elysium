/**
 * Ferraz NPC shop inventory — Ferraria do Ferraz.
 * Ferraz sells upgraded tools and forged weapons. Essential for player progression.
 */

export interface ShopItem {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
  category: 'tool' | 'weapon' | 'material';
}

export const FERRAZ_SHOP_ID = 'ferraz' as const;

export const FERRAZ_SHOP_ITEMS: ShopItem[] = [
  // Upgraded tools
  {
    item_id: 'hoe_upgraded',
    name: 'Enxada Reforçada',
    icon: '⛏️',
    price: 300,
    stock: 3,
    category: 'tool',
  },
  {
    item_id: 'pickaxe',
    name: 'Picareta',
    icon: '⛏️',
    price: 400,
    stock: 3,
    category: 'tool',
  },
  // Weapons
  {
    item_id: 'sword',
    name: 'Espada de Ferro',
    icon: '⚔️',
    price: 600,
    stock: 2,
    category: 'weapon',
  },
  // Materials
  {
    item_id: 'iron_ingot',
    name: 'Lingote de Ferro',
    icon: '🪨',
    price: 80,
    stock: 20,
    category: 'material',
  },
];

export const FERRAZ_SHOP = {
  shopId: FERRAZ_SHOP_ID,
  shopName: 'Ferraria do Ferraz',
  items: FERRAZ_SHOP_ITEMS,
} as const;

export default FERRAZ_SHOP;
