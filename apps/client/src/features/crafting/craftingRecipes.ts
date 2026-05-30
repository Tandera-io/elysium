import type { ItemId } from '../../systems/inventory/inventoryStore';

export type CraftableId = 'bread' | 'salad' | 'pumpkin_pie' | 'corn_stew' | 'berry_jam';

export interface RecipeIngredient {
  id: ItemId;
  qty: number;
}

export interface CraftingRecipe {
  id: CraftableId;
  name: string;
  icon: string;
  ingredients: RecipeIngredient[];
  outputId: CraftableId;
  outputQty: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'bread',
    name: 'Pão',
    icon: '🍞',
    ingredients: [{ id: 'wheat', qty: 3 }],
    outputId: 'bread',
    outputQty: 1,
  },
  {
    id: 'salad',
    name: 'Salada',
    icon: '🥗',
    ingredients: [
      { id: 'tomato', qty: 2 },
      { id: 'corn', qty: 1 },
    ],
    outputId: 'salad',
    outputQty: 1,
  },
  {
    id: 'pumpkin_pie',
    name: 'Torta de Abóbora',
    icon: '🥧',
    ingredients: [
      { id: 'pumpkin', qty: 2 },
      { id: 'wheat', qty: 1 },
    ],
    outputId: 'pumpkin_pie',
    outputQty: 1,
  },
  {
    id: 'corn_stew',
    name: 'Caldo de Milho',
    icon: '🍲',
    ingredients: [{ id: 'corn', qty: 4 }],
    outputId: 'corn_stew',
    outputQty: 2,
  },
  {
    id: 'berry_jam',
    name: 'Geleia de Morango',
    icon: '🍓',
    ingredients: [{ id: 'strawberry', qty: 5 }],
    outputId: 'berry_jam',
    outputQty: 1,
  },
];
